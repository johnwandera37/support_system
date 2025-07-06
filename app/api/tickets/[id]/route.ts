import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { ticketEscalationSchema, ticketUpdateSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse } from "@/utils/responseUtils";

// The following API, gets a single ticket by id(all users), updates ticket status and assignedTo properties(admin/agent), deletes a ticket only if admin
// GET TICKET
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req);
  if (!("authorized" in auth)) return auth;
  const user = auth.user; //Get user with role "USER" id from decoded access token

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          where: {
            deletedAt: null, // Exclude soft-deleted comments
          },
        },
        privateComments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          where: {
            deletedAt: null, // Exclude soft-deleted comments
          },
        },
      },
    });

    if (!ticket || (user.role === "USER" && ticket.userId !== user.id)) {
      return nextErrorResponse("Not found", 404);
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    errLog("GET TICKET ERROR", getErrorMessage(error));
    return nextErrorResponse("Internal server error", 500);
  }
}

// UPDATE TICKET
//N/B An admin can make changes to tickets without the need for them to be assigned to the tickets, but the business rules defined in this PATCH are applied

// For a ticket to be updated, it expects either:
// 1. assignedTo, this is id where a ticket is assigned to either an admin or agent
//    status of the ticket, by default ticket is OPEN, when user is assigned it updates to PENDING, agent only have options to RESOLVED or CLOSED, and back to PENDING just in case
//    priority of the ticket can be updated by user only if they fill that the situation is not critical or more critical, admin/agent can update priority but this option will not be availbale for them in front end
// 2. For escallation, isEscalated (should help trigger escalation from frontend) and escalated reason to be provided from the body, the rest are provided in the code
// 3. The ticket can only be closed if its status is RESOLVED
// 4. Ticket assingnment on CLOSED or RESOLVED tickets is not allowed
// 5. When a user has been assigned to a ticket, it automatically updates its status to pending
// 6. The AGENT will have no option to unassigned the ticket once assigned, but if they are unable to RESOLVE the ticket and eventually CLOSE,
// they can add a reason(private comments only visible to admin and agent). If its serious and they are unable to complete the ticket they can initiate escalation
// (Escalation is only possible if there is reason). Admin will look at it, decide whether he can assigned the ticket to a differnt agent
// (Here it will be possible because ticket is in pending state) or provide info on how to handle the ticket
// Take note the only way to change ticket assignement is when a ticket has been escalated
// 7. assignemnt and status history tracking
// 8. Multiple agents to be assigend the same ticket || Multiple admins can be escalated the same ticket, but this is not a priority for now, easy to implement but requires some changes to the schema and the PATCH code

// Helper to find available admin (manual selection)
async function findAvailableAdmin(adminId?: string): Promise<string> {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
      role: "ADMIN",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("Selected admin not found or not available");
  }

  return admin.id;
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["AGENT", "ADMIN", "USER"])(req);
  if (!("authorized" in auth)) return auth;

  const currentUser = auth.user;
  const body = await req.json();
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequestFromZod(parsed.error);

  try {
    // 1. Fetch ticket with assignment info
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!existingTicket) return nextErrorResponse("Ticket not found", 404);

    // 2. USER-SPECIFIC CHECKS
    if (currentUser.role === "USER") {
      // Users can only update priority and only on their own tickets
      if (existingTicket.userId !== currentUser.id) {
        return nextErrorResponse("You can only update your own tickets", 403);
      }

      // Users can only update priority, nothing else
      const allowedUpdates = Object.keys(parsed.data).filter(
        (key) => key === "priority"
      );
      if (allowedUpdates.length === 0) {
        return nextErrorResponse("Users can only update ticket priority", 403);
      }

      // Prepare update data with only priority
      const updateData = {
        priority: parsed.data.priority,
      };

      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: updateData,
      });

      return NextResponse.json(updatedTicket);
    }

    //3. Status transition validation
    if (
      parsed.data.status === "CLOSED" &&
      existingTicket.status !== "RESOLVED"
    ) {
      return nextErrorResponse("Ticket must be RESOLVED before closing", 400);
    }

    // 4. Handle closed/resolved tickets with flexibility
    if (existingTicket.status === "CLOSED") {
      const isReopening =
        parsed.data.status && ["OPEN", "PENDING"].includes(parsed.data.status);

      if (!isReopening) {
        return nextErrorResponse(
          "This ticket does not need further actions. It has been closed.",
          409
        );
      }
    }

    if (existingTicket.status === "RESOLVED") {
      const newStatus = parsed.data.status;
      const isSelf = existingTicket.assignedTo === currentUser.id;

      const isAdminClosing =
        parsed.data.status === "CLOSED" && currentUser.role === "ADMIN";

      const isAgentReopening =
        isSelf &&
        currentUser.role === "AGENT" &&
        ["OPEN", "PENDING"].includes(newStatus || "");

      if (!isAdminClosing && !isAgentReopening) {
        const assigneeName = existingTicket.assignedAgent?.name || "an agent";
        return nextErrorResponse(
          `This ticket does not need further actions. ${
            isSelf ? "You" : assigneeName
          } should mark it as closed if completed.`,
          409
        );
      }
    }

    // 5. Assignment logic (only if assignedTo is being modified)
    if (parsed.data.assignedTo !== undefined) {
      // 5a. Get the user whom the ticket is being assigned
      const targetUser = await prisma.user.findUnique({
        where: { id: parsed.data.assignedTo },
      });

      if (!targetUser || !["AGENT", "ADMIN"].includes(targetUser.role)) {
        return nextErrorResponse("Invalid assignee", 400);
      }

      const isSameAssignee =
        existingTicket.assignedTo === targetUser.id &&
        existingTicket.assignedTo === currentUser.id;

      // Prevent duplicate assignment
      if (isSameAssignee) {
        return nextErrorResponse(
          targetUser.role === "AGENT"
            ? "You have already assigned yourself this ticket"
            : `Ticket already assigned to ${targetUser.name}`,
          400
        );
      }

      const isAssigned = existingTicket.assignedTo;

      // AGENT logic
      if (currentUser.role === "AGENT") {
        // Block self reassignment
        if (targetUser.id !== currentUser.id) {
          return nextErrorResponse(
            "Agents can only assign tickets to themselves",
            403
          );
        }

        // Block an assigned ticket by agent
        if (isAssigned) {
          return nextErrorResponse(
            `This ticket is already being handled by ${existingTicket.assignedAgent?.name}`,
            400
          );
        }
      }

      // ADMIN reassignment logic
      if (currentUser.role === "ADMIN") {
        const isReassigning =
          existingTicket.assignedTo &&
          targetUser.id !== existingTicket.assignedTo;

        if (isReassigning) {
          if (!existingTicket.isEscalated) {
            return nextErrorResponse(
              `The current assignee, ${existingTicket.assignedAgent?.name}, has not escalated this ticket, therefore reassignment is not possible`,
              400
            );
          }

          if (existingTicket.escalatedTo !== currentUser.id) {
            return nextErrorResponse(
              "Only the admin the ticket was escalated to can reassign it",
              403
            );
          }
        }
      }

      // ✅ Passed all checks — assignment will proceed in transaction section
    }

    // 6. Prevent admin/agent from updating priority
    if (
      currentUser.role !== "USER" &&
      "priority" in parsed.data &&
      parsed.data.priority !== existingTicket.priority
    ) {
      return nextErrorResponse("Only users can update ticket priority", 403);
    }

    // 7. Escalation logic
    if (parsed.data.isEscalated) {
      if (existingTicket.isEscalated) {
        return nextErrorResponse(
          "This ticket has been escalated to an admin and cannot be escalated again",
          409
        );
      }
      if (existingTicket.status !== "PENDING") {
        return nextErrorResponse("Only PENDING tickets can be escalated", 400);
      }

      if (!parsed.data.escalationReason) {
        return nextErrorResponse("Escalation reason is required", 400);
      }

      if (!parsed.data.escalatedTo) {
        return nextErrorResponse("Please select an admin to escalate to", 400);
      }

      // Find available admin
      try {
        const adminId = await findAvailableAdmin(parsed.data.escalatedTo);

        const updatedTicket = await prisma.$transaction(async (tx) => {
          // 1. Update ticket first
          const updatedTicket = await tx.ticket.update({
            where: { id: params.id },
            data: {
              isEscalated: true,
              escalationReason: parsed.data.escalationReason,
              escalatedBy: currentUser.id,
              escalatedAt: new Date(),
              escalatedTo: adminId,
              status: "PENDING",
            },
          });

          // 2. Create notifications
          await tx.notification.createMany({
            data: [
              {
                userId: adminId,
                type: "TICKET_ESCALATION",
                message: `Ticket #${params.id} escalated by ${existingTicket.assignedAgent?.name}`,
                metadata: { ticketId: params.id },
              },
              {
                userId: existingTicket.userId,
                type: "TICKET_ESCALATION",
                message: `Your ticket #${params.id} has been escalated`,
                metadata: { ticketId: params.id },
              },
            ],
          });

          // 3. Add private comment
          await tx.privateComment.create({
            data: {
              content: `ESCALATION: ${parsed.data.escalationReason}`,
              ticketId: params.id,
              userId: currentUser.id, // User who is creating the comment
            },
          });

          return updatedTicket;
        });

        // ✅ Return a valid response from the handler
        return NextResponse.json(updatedTicket, { status: 200 });
      } catch (error) {
        // error will be thrown from findAvailableAdmin
        return nextErrorResponse(getErrorMessage(error), 400);
      }
    }

    //8. Start transaction for atomic normal updates
    const result = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        ...parsed.data,
      };

      // Handle assignment changes
      if (
        "assignedTo" in parsed.data &&
        parsed.data.assignedTo !== existingTicket.assignedTo
      ) {
        // Auto-update status to PENDING when assigning if currently unassigned
        if (!existingTicket.assignedTo) {
          updateData.status = "PENDING";
        }

        // Notify new assignee
        if (parsed.data.assignedTo) {
          await tx.notification.create({
            data: {
              userId: parsed.data.assignedTo,
              type: "TICKET_ASSIGNMENT",
              message: `You've been assigned Ticket #${params.id}`,
              metadata: { ticketId: params.id },
            },
          });
        }

        // Notify ticket creator
        await tx.notification.create({
          data: {
            userId: existingTicket.userId,
            type: "TICKET_ASSIGNMENT",
            message: `Your ticket #${params.id} has been assigned for handling`,
            metadata: { ticketId: params.id },
          },
        });

        // Log assignment change
        await tx.ticketAssignmentLog.create({
          data: {
            ticketId: params.id,
            oldAssignee: existingTicket.assignedTo,
            newAssignee: parsed.data.assignedTo,
            userId: currentUser.id,
          },
        });
      }

      // Handle status changes
      if (parsed.data.status && parsed.data.status !== existingTicket.status) {
        // Notify if agent reopens a resolved ticket
        if (
          existingTicket.status === "RESOLVED" &&
          ["OPEN", "PENDING"].includes(parsed.data.status) &&
          currentUser.role === "AGENT" &&
          currentUser.id === existingTicket.assignedTo
        ) {
          await tx.notification.create({
            data: {
              userId: existingTicket.userId,
              type: "TICKET_REOPENED",
              message: `Ticket #${params.id} has been reopened by ${existingTicket.assignedAgent?.name}`,
              metadata: { ticketId: params.id },
            },
          });
        }
        // Notify on resolution/closure
        if (["RESOLVED", "CLOSED"].includes(parsed.data.status)) {
          await tx.notification.create({
            data: {
              userId: existingTicket.userId,
              type:
                parsed.data.status === "RESOLVED"
                  ? "TICKET_RESOLVED"
                  : "TICKET_CLOSED",
              message: `Your ticket #${
                params.id
              } has been ${parsed.data.status.toLowerCase()}`,
              metadata: { ticketId: params.id },
            },
          });
        }

        // Log status change
        await tx.ticketStatusLog.create({
          data: {
            ticketId: params.id,
            oldStatus: existingTicket.status,
            newStatus: parsed.data.status,
            userId: currentUser.id,
          },
        });
      }

      // Final ticket update with all modifications
      return await tx.ticket.update({
        where: { id: params.id },
        data: updateData, // Includes any status updates from assignment
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    errLog("TICKET PATCH ERROR", getErrorMessage(error));
    return nextErrorResponse("Internal server error", 500);
  }
}

// DELETE TICKET
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

  try {
    await prisma.ticket.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    errLog("DELETE ERROR", getErrorMessage(error));
    return nextErrorResponse("Internal server error", 500);
  }
}
