import z from "zod/v4";
import {
  authFnResult,
  commonInternalError,
  forbiddenAuthFnResult,
  registry,
} from "../reusableObjects";
import { commentSchema, commentUpdateSchema, zodTreeifiedErrorSchema } from "@/lib/zodSchema";

const commentErrorResponses = {
  401: authFnResult,
  403: {
    description: "Permission denied",
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
        examples: {
          roleSpecifiedRequired: forbiddenAuthFnResult,
          closedTickets: {
            summary: "Closed ticket",
            value: {
              error: "Cannot modify comments on closed tickets",
            },
          },
          notOwner: {
            summary: "Not owner",
            value: {
              error: "You can only modify your own comments",
            },
          },
          timeExpired: {
            summary: "Time to modify expired",
            value: {
              error:
                "Comments can only be modified within 15 minutes of creation",
            },
          },

          privateCommentAdminAccess: {
            summary:
              "Only admin this ticket was escalated to or assigned agent can modify comments",
            value: {
              error:
                "Only the assigned agent or escalated admin can modify private comments",
            },
          },
          privateCommentAccess: {
            summary: "Unassigned agent trying to modify private comment",
            value: {
              error:
                "Only the assigned agent can modify private comments on this ticket",
            },
          },
        },
      },
    },
  },
  404: {
    description: "Comment not found",
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
        examples: {
          notFound: {
            value: {
              error: "Comment not found",
            },
          },
        },
      },
    },
  },
  410: {
    description: "Comment already deleted",
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
        examples: {
          deleted: {
            value: {
              error: "Comment already deleted",
            },
          },
        },
      },
    },
  },
};

export function registerComment() {
  // PUT /api/comments/{id}
  registry.registerPath({
    method: "put",
    path: "/api/comments/{id}",
    tags: ["Comments"],
    summary: "Update a comment",
    description: `
    Updates an existing comment within 15 minutes of creation.
    
    Role-Specific Permissions:
    - Users: Can update their own public comments
    - Agents: Can update their own comments (public/private on assigned tickets)
    - Admins: Can update their own comments (public/private on assigned/escalated tickets)
    
    Business Rules:
    1. Time Window:
       - Comments can only be modified within 15 minutes of creation
       - Applies to all users including admins
    
    2. Private Comments:
       - Only visible to agents/admins
       - Must be modified by assigned agent or admin
    
    3. Closed Tickets:
       - No comments can be modified on closed tickets
    
    4. A shared util to validate business rules in both PUT and DELETE is used hence, keyword modify is used for editing/deleting comments
    `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "cmc547s330009u448t6qdc7e3",
          description: "ID of the comment to update",
        }),
      }),
      body: {
        content: {
          "application/json": {
            schema: commentUpdateSchema,
            examples: {
              updateContent: {
                summary: "Update comment content",
                value: {
                  content: "Updated comment with more details",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Comment updated successfully",
        content: {
          "application/json": {
            schema: commentSchema,
            examples: {
              publicComment: {
                value: {
                  id: "cmc547s330009u448t6qdc7e3",
                  content: "Updated comment with more details",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                  userId: "usr_123",
                  createdAt: "2025-06-20T18:00:10.240Z",
                  editedAt: "2025-06-20T18:10:15.123Z",
                  deletedAt: null,
                },
              },
              privateComment: {
                value: {
                  id: "cmcdf9olg0013u4g09v3559l9",
                  content: "Updated private note",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                  userId: "agent_456",
                  createdAt: "2025-06-26T13:31:44.450Z",
                  editedAt: "2025-06-26T13:35:22.789Z",
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error, or malformed JSON body",
        content: {
          "application/json": {
            schema: z.union([zodTreeifiedErrorSchema, z.object({ error: z.string() })]),
            examples: {
              invalidJson: {
                summary: "Malformed request body",
                value: { error: "Request body must be valid JSON" },
              },
              zodErrors: {
                summary: "Field validation errors",
                value: {
                  error: {
                    properties: {
                      content: { errors: ["Too small: expected string to have >=1 characters"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...commentErrorResponses, // Spread shared error responses
      500: commonInternalError("Failed to update comment"),
    },
  });

  // DELETE /api/comments/{id}
  registry.registerPath({
    method: "delete",
    path: "/api/comments/{id}",
    tags: ["Comments"],
    summary: "Delete a comment",
    description: `
    Soft deletes a comment (marks as deleted but keeps record).
    
    Role-Specific Permissions:
    - Users: Can delete their own public comments
    - Agents: Can delete their own comments (public/private on assigned tickets)
    - Admins: Can delete their own comments
    
    Business Rules:
    1. Time Window:
       - Comments can only be deleted within 15 minutes of creation
       - Applies to all users including admins
    
    2. Private Comments:
       - Only visible to agents/admins
       - Must be deleted by assigned agent or admin (aurthor)
    
    3. Closed Tickets:
       - No comments can be deleted on closed tickets
       
    4. A shared util to validate business rules in both PUT and DELETE is used hence, keyword modify is used for editing/deleting comments   
    `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "cmc547s330009u448t6qdc7e3",
          description: "ID of the comment to delete",
        }),
      }),
    },
    responses: {
      200: {
        description: "Comment deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({ example: "Comment deleted successfully" }),
            }),
            examples: {
              success: {
                value: { success: true, message: "Comment deleted successfully" },
              },
            },
          },
        },
      },
      ...commentErrorResponses, // Spread shared error responses
      500: commonInternalError("Failed to delete comment"),
    },
  });
}
