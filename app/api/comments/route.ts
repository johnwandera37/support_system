import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { commentCreateSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse } from "@/utils/responseUtils";
import { errLog } from "@/utils/console-logger";
import { getErrorMessage } from "@/utils/errMsg";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";

const ROUTE = endpoints.createOrGetComment;

// Create ticket comment
export async function POST(req: Request) {
  try {
    // allow USER, AGENT or ADMIN to add comments
    const auth = await authorize(["USER", "AGENT", "ADMIN"])(req, ROUTE);
    if (!("authorized" in auth)) return auth;
    const user = auth.user;

    const body = await req.json();
    const parsed = commentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestFromZod(parsed.error);
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
      return nextErrorResponse("Ticket not found", 404);
    }

    if (ticket.status === "CLOSED") {
      return nextErrorResponse(
        "This ticket is closed hence comments are not allowed anymore",
        409
      );
    }

    // Permision check
    if (parsed.data.isPrivate) {
      // Private comment permissions
      if (user.role === "USER") {
        return nextErrorResponse("Users cannot create private comments", 403);
      }

      if (user.role === "AGENT" && ticket.assignedTo !== user.id) {
        return nextErrorResponse(
          "Agents can only add private comments to their assigned tickets",
          403
        );
      }
    } else {
      // Public comment permissions
      // Users can only comment on their own tickets
      if (user.role === "USER" && ticket.userId !== user.id) {
        return nextErrorResponse(
          "You can only comment on your own tickets",
          403
        );
      }

      // Agents can only comment on tickets assigned to them
      if (
        user.role === "AGENT" &&
        (!ticket.assignedTo || ticket.assignedTo !== user.id)
      ) {
        return nextErrorResponse(
          ticket.assignedTo
            ? `This ticket is assigned to ${
                ticket.assignedAgent?.name || "another agent"
              }`
            : "This ticket is not assigned to any agent",
          403
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
    return nextErrorResponse(
      "An unexpected error occurred while creating the comment",
      500
    );
  }
}
