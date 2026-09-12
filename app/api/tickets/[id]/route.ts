import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ticketUpdateSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse, nextInfoResponse, nextWarnResponse } from "@/utils/responseUtils";
import { Prisma } from "@/lib/generated/prisma/client";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";

const ROUTE = endpoints.ticket

// The following APIs, gets a single ticket by id(all users), updates ticket status and assignedTo properties(admin/agent), deletes a ticket only if admin
// GET TICKET
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req, ROUTE);
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
      },
    });

    if (!ticket || (user.role === "USER" && ticket.userId !== user.id)) {
      return nextWarnResponse("Ticket not found", 404, { route: ROUTE, meta: { ticketId: params.id } });
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to fetch ticket" });
  }
}

// UPDATE TICKET
//N/B An admin can make changes to tickets without the need for them to be assigned to the tickets, but the business rules defined in this PATCH are applied

// For a ticket to be updated, it expects either:
// 1. assignedTo, this is id where a ticket is assigned to either an admin or agent
//    status of the ticket, by default ticket is OPEN, when user is assigned it updates to PENDING, agent only have options to RESOLVED or CLOSED, and back to PENDING just in case
//    priority of the ticket can be updated by USER only if they fill that the situation is not critical or more critical, admin/agent can update priority but this option will not be availbale for them in front end
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
// anything that reaches the catch block afterward is unambiguously 
// a real DB/system failure, not a business rejection.
async function findAvailableAdmin(adminId?: string): Promise<string | null> {
  if (!adminId) return null;

  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
      role: "ADMIN",
    },
    select: { id: true },
  });

  return admin?.id ?? null;
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["AGENT", "ADMIN", "USER"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  const currentUser = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return nextWarnResponse("Request body must be valid JSON", 400, { route: ROUTE });
  }

  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequestFromZod(parsed.error, 400, { route: ROUTE });

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

    if (!existingTicket) {
      return nextWarnResponse("Ticket not found", 404, { route: ROUTE, meta: { ticketId: params.id } });
    }

    // 2. USER-SPECIFIC CHECKS
    if (currentUser.role === "USER") {
      // Users can only update priority and only on their own tickets
      if (existingTicket.userId !== currentUser.id) {
        return nextWarnResponse("You can only update your own tickets", 403, { route: ROUTE });
      }

      // Users can only update priority, nothing else
      const allowedUpdates = Object.keys(parsed.data).filter(
        (key) => key === "priority"
      );
      if (allowedUpdates.length === 0) {
        return nextWarnResponse("Users can only update ticket priority", 403, { route: ROUTE });
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

    // AGENT must be the assigned agent to modify this ticket in any way, with
    // one exception: self-assigning a currently-unassigned ticket (that's how
    // they become the assigned agent in the first place).
    const isSelfAssigning = parsed.data.assignedTo === currentUser.id;

    if (currentUser.role === "AGENT" && existingTicket.assignedTo !== currentUser.id && !isSelfAssigning) {
      return nextWarnResponse("Only the agent assigned to this ticket can make this update", 403, {
        route: ROUTE,
        meta: { ticketId: params.id },
      });
    }

    //3. Status transition validation
    if (
      parsed.data.status === "CLOSED" &&
      existingTicket.status !== "RESOLVED"
    ) {
      return nextWarnResponse("Ticket must be RESOLVED before closing", 400, { route: ROUTE });
    }

    // 4. Handle closed/resolved tickets with flexibility
    if (existingTicket.status === "CLOSED") {
      const isReopening =
        parsed.data.status && ["OPEN", "PENDING"].includes(parsed.data.status);

      if (!isReopening) {
        return nextWarnResponse(
          "This ticket does not need further actions. It has been closed.",
          409,
          { route: ROUTE }
        );
      }
    }

    if (existingTicket.status === "RESOLVED") {
      const newStatus = parsed.data.status;
      const isSelf = existingTicket.assignedTo === currentUser.id;

      const isValidClose =
        newStatus === "CLOSED" && (currentUser.role === "ADMIN" || (currentUser.role === "AGENT" && isSelf));

      const isValidReopen =
        ["OPEN", "PENDING"].includes(newStatus || "") &&
        (currentUser.role === "ADMIN" || (currentUser.role === "AGENT" && isSelf));


      if (!isValidClose && !isValidReopen) {
        const assigneeName = existingTicket.assignedAgent?.name || "the assigned agent";
        return nextWarnResponse(
          `This ticket does not need further actions. ${isSelf ? "You" : assigneeName} should mark it as closed if completed.`,
          409,
          { route: ROUTE }
        );
      }
    }

    // 5. Assignment logic (only if assignedTo is being modified)
    if (parsed.data.assignedTo !== undefined) {
      // 5a. Get the user whom the ticket is being assigned
      const targetUser = await prisma.user.findUnique({
        where: { id: parsed.data.assignedTo },
      });

      // No matter what, the assignment should be possible for AGENTS or ADMINS, no USER should be assigned a ticket
      if (!targetUser || !["AGENT", "ADMIN"].includes(targetUser.role)) {
        return nextWarnResponse("Invalid assignee", 400, { route: ROUTE });
      }

      const isSameAssignee =
        existingTicket.assignedTo === targetUser.id &&
        existingTicket.assignedTo === currentUser.id;

      // Prevent duplicate assignment
      if (isSameAssignee) {
        return nextWarnResponse(
          targetUser.role === "AGENT"
            ? "You have already assigned yourself this ticket"
            : `Ticket already assigned to ${targetUser.name}`,
          400,
          { route: ROUTE }
        );
      }

      const isAssigned = existingTicket.assignedTo;

      // AGENT logic
      if (currentUser.role === "AGENT") {
        // Block self reassignment
        if (targetUser.id !== currentUser.id) {
          return nextWarnResponse("Agents can only assign tickets to themselves", 403, { route: ROUTE });
        }

        // Block an assigned ticket by agent
        if (isAssigned) {
          return nextWarnResponse(
            `This ticket is already being handled by ${existingTicket.assignedAgent?.name}`,
            400,
            { route: ROUTE }
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
            return nextWarnResponse(
              `The current assignee, ${existingTicket.assignedAgent?.name}, has not escalated this ticket, therefore reassignment is not possible`,
              400,
              { route: ROUTE }
            );
          }

          if (existingTicket.escalatedTo !== currentUser.id) {
            return nextWarnResponse(
              "Only the admin the ticket was escalated to can reassign it",
              403,
              { route: ROUTE }
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
      return nextWarnResponse("Only users can update ticket priority", 403, { route: ROUTE });
    }

    // 7. Escalation logic
    if (parsed.data.isEscalated) {
      if (existingTicket.isEscalated) {
        return nextWarnResponse(
          "This ticket has been escalated to an admin and cannot be escalated again",
          409,
          { route: ROUTE }
        );
      }
      if (existingTicket.status !== "PENDING") {
        return nextWarnResponse("Only PENDING tickets can be escalated", 400, { route: ROUTE });
      }

      if (!parsed.data.escalationReason) {
        return nextWarnResponse("Escalation reason is required", 400, { route: ROUTE });
      }

      if (!parsed.data.escalatedTo) {
        return nextWarnResponse("Please select an admin to escalate to", 400, { route: ROUTE });
      }

      // Find available admin
      const adminId = await findAvailableAdmin(parsed.data.escalatedTo);

      if (!adminId) {
        return nextWarnResponse("Selected admin not found or not available", 404, {
          route: ROUTE,
          meta: { escalatedTo: parsed.data.escalatedTo },
        });
      }

      try {
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
              status: "ESCALATED", // Ticket status will be updated to ESCALATED
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
        return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to escalate ticket" });
      }
    }

    //8. Start transaction for atomic normal updates
    const result = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Prisma.TicketUpdateInput = {
        ...parsed.data,
      };

      // Handle assignment changes
      if (
        "assignedTo" in parsed.data &&
        parsed.data.assignedTo !== existingTicket.assignedTo
      ) {
        // Auto-update status to ASSINED when assigning if currently unassigned
        if (!existingTicket.assignedTo) {
          updateData.status = "ASSIGNED";
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
              message: `Your ticket #${params.id
                } has been ${parsed.data.status.toLowerCase()}`,
              metadata: { ticketId: params.id },
            },
          });
        }

        // Notify when ticket is marked as INPROGRESS
        if (parsed.data.status === "INPROGRESS") {
          await tx.notification.create({
            data: {
              userId: existingTicket.userId,
              type: "TICKET_IN_PROGRESS",
              message: `Your ticket #${params.id} is now in progress`,
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
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to update ticket" });
  }
}

// DELETE TICKET
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["ADMIN"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  const existingTicket = await prisma.ticket.findUnique({
    where: { id: params.id },
  });

  if (!existingTicket) {
    return nextWarnResponse("Ticket not found", 404, { route: ROUTE, meta: { ticketId: params.id } });
  }

  try {
    await prisma.ticket.delete({ where: { id: params.id } });
    return nextInfoResponse("Ticket deleted successfully", 200, {
      route: ROUTE,
      meta: { ticketId: params.id },
    });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to delete ticket" });
  }
}
