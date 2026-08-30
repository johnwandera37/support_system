import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { commentCreateSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";
import { errLog } from "@/utils/console-logger";
import { getErrorMessage } from "@/utils/errMsg";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";

const ROUTE = endpoints.createComment;

// Create ticket comment
export async function POST(req: Request) {
  try {
    // allow USER, AGENT or ADMIN to add comments
    const auth = await authorize(["USER", "AGENT", "ADMIN"])(req, ROUTE);
    if (!("authorized" in auth)) return auth;
    const user = auth.user;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return nextWarnResponse("Request body must be valid JSON", 400, { route: ROUTE });
    }

    const parsed = commentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestFromZod(parsed.error, 400, { route: ROUTE });
    }

    // First, fetch the ticket to check permissions
    const ticket = await prisma.ticket.findUnique({
      where: { id: parsed.data.ticketId },
      select: {
        status: true,
        userId: true, // The user who created the ticket (string ID)
        assignedTo: true, // The agent assigned to the ticket (string ID or null)
        assignedAgent: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!ticket) {
      return nextWarnResponse("Ticket not found", 404, {
        route: ROUTE,
        meta: { ticketId: parsed.data.ticketId },
      });
    }

    if (ticket.status === "CLOSED") {
      return nextWarnResponse("This ticket is closed hence comments are not allowed anymore", 409, {
        route: ROUTE,
      });
    }

    // Permision check
    if (parsed.data.isPrivate) {
      // Private comment permissions
      if (user.role === "USER") {
        return nextWarnResponse("Users cannot create private comments", 403, { route: ROUTE });
      }

      if (user.role === "AGENT" && ticket.assignedTo !== user.id) {
        return nextWarnResponse("Agents can only add private comments to their assigned tickets", 403, {
          route: ROUTE,
        });
      }
    } else {
      // Public comment permissions
      // Users can only comment on their own tickets
      if (user.role === "USER" && ticket.userId !== user.id) {
        return nextWarnResponse("You can only comment on your own tickets", 403, { route: ROUTE });
      }

      // Agents can only comment on tickets assigned to them
      if (
        user.role === "AGENT" &&
        (!ticket.assignedTo || ticket.assignedTo !== user.id)
      ) {
        return nextWarnResponse(
          ticket.assignedTo
            ? `This ticket is assigned to ${ticket.assignedAgent?.name || "another agent"}`
            : "This ticket is not assigned to any agent",
          403,
          { route: ROUTE }
        );
      }
    }

    // ADMINs can comment on any ticket - no additional checks needed

    // Create the appropriate comment type
    const commentData = {
      content: parsed.data.content,
      ticketId: parsed.data.ticketId,
      userId: user.id, // User who is creating the comment
    };

    const comment = parsed.data.isPrivate
      ? await prisma.privateComment.create({ data: commentData })
      : await prisma.comment.create({ data: commentData });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    errLog("Error in POST /api/comments:", getErrorMessage(error));
     return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to create comment" });
  }
}
