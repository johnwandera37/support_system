import prisma from "@/lib/db";
import { commentUpdateSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse, nextInfoResponse, nextWarnResponse } from "@/utils/responseUtils";
import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { COMMENT_EDIT_WINDOW_MIN, endpoints } from "@/config/constants";

const ROUTE = endpoints.updateOrDeleteComment;

type CommentValidationResult =
  | { error: string; status: number }
  | {
    comment: {
      id: string;
      content: string;
      ticket: {
        userId: string;
        assignedTo: string | null;
      };
    };
    isPrivate: boolean;
  };

const EDIT_WINDOW_MS = COMMENT_EDIT_WINDOW_MIN * 60 * 1000;

// Shared permission checker util
async function validateCommentAccess(
  commentId: string,
  userId: string
): Promise<CommentValidationResult> {
  // Check both comment tables
  const [publicComment, privateComment] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        deletedAt: true,
        ticket: {
          select: {
            userId: true,
            assignedTo: true,
            status: true,
            isEscalated: true,
            escalatedTo: true,
          },
        },
      },
    }),
    prisma.privateComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        deletedAt: true,
        ticket: {
          select: {
            userId: true,
            assignedTo: true,
            status: true,
            isEscalated: true,
            escalatedTo: true,
          },
        },
      },
    }),
  ]);

  // Determine which comment we're working with
  const comment = publicComment || privateComment;
  const isPrivateComment = !!privateComment; // true if found in private table

  // Basic validation check
  // Comment not existing
  if (!comment) return { error: "Comment not found", status: 404 };

  // Commented deleted
  if (comment.deletedAt)
    return { error: "Comment already deleted", status: 410 };

  // Check ticket status (only allow modifications on open tickets)
  if (comment.ticket.status === "CLOSED") {
    return { error: "Cannot modify comments on closed tickets", status: 403 };
  }

  // Any user trying to modify other user's comment is forbidden
  if (comment.userId !== userId) {
    return { error: "You can only modify your own comments", status: 403 };
  }


  // Strict 15 min to make changes to comment, applies to all for integrity and fair system
  const commentAge = Date.now() - new Date(comment.createdAt).getTime();
  if (commentAge > EDIT_WINDOW_MS) {
    return {
      error: "Comments can only be modified within 15 minutes of creation",
      status: 403,
    };
  }

  // Additional checks for private comments
  if (isPrivateComment) {
    const ticket = comment.ticket;

    // For escalated tickets, only the assigned agent and admin it was escalated to can add private comments
    if (ticket.isEscalated && ticket.escalatedTo !== userId && userId !== ticket.assignedTo) {
      return {
        error:
          "Only the assigned agent or escalated admin can modify private comments",
        status: 403,
      };
    }

    // For non-escalated tickets, only assigned agent can add private comments
    if (!ticket.isEscalated && ticket.assignedTo !== userId) {
      return {
        error:
          "Only the assigned agent can modify private comments on this ticket",
        status: 403,
      };
    }
  }

  // If all checks pass
  return { comment, isPrivate: !!privateComment }; // isPrivate is Still useful for routing updates
}

// ================================ < Update comment > ================================
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params; // Get the comment id passed in the endpoint url

  // Authorize users
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  // Access user id and role
  const user = auth.user;

  // Validate content from body using zod schema
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return nextWarnResponse("Request body must be valid JSON", 400, { route: ROUTE });
  }
  const parsed = commentUpdateSchema.safeParse(body);

  // Return a bad request if invalid content provided from body
  if (!parsed.success) {
    return badRequestFromZod(parsed.error, 400, { route: ROUTE });
  }

  // Validate comment access and manipulation by passing the comment id, user id and isPrivate
  const validation = await validateCommentAccess(params.id, user.id);
  if ("error" in validation) {
    return nextWarnResponse(validation.error, validation.status, { route: ROUTE, meta: { commentId: params.id } });
  }

  // Update the correct comment type based on validation result
  try {
    const updatedComment = validation.isPrivate
      ? await prisma.privateComment.update({
        where: { id: params.id },
        data: { content: parsed.data.content, editedAt: new Date() },
      })
      : await prisma.comment.update({
        where: { id: params.id },
        data: { content: parsed.data.content, editedAt: new Date() },
      });

    return NextResponse.json(updatedComment);
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to update comment" });
  }
}

// ================================ < Delete Comment > ================================

// DELETE a comment
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params; // Get the comment id passed in the endpoint url

  // Authorizse deletion of comment based on the aurthor
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  // Access user info
  const user = auth.user;

  // Validate comment access and manipulation by passing the comment id and user id
  const validation = await validateCommentAccess(params.id, user.id);
  if ("error" in validation) {
    return nextWarnResponse(validation.error, validation.status, { route: ROUTE, meta: { commentId: params.id } });
  }

  try {
    // Soft delete implementation
    if (validation.isPrivate) {
      await prisma.privateComment.update({
        where: { id: params.id },
        data: { deletedAt: new Date(), content: "[deleted]" },
      });
    } else {
      await prisma.comment.update({
        where: { id: params.id },
        data: { deletedAt: new Date(), content: "[deleted]" },
      });
    }

    return nextInfoResponse("Comment deleted successfully", 200, { route: ROUTE, meta: { commentId: params.id } });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to delete comment" });
  }
}
