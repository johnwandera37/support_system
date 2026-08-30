import z from "zod/v4";
import { authFnResult, commonInternalError, forbiddenAuthFnResult, registry, ticketNotFoundFullExample } from "../reusableObjects";
import { commentCreateSchema, commentSchema, zodTreeifiedErrorSchema } from "@/lib/zodSchema";

export function registerComments() {
  registry.registerPath({
    method: "post",
    path: "/api/comments",
    tags: ["Comments"],
    summary: "Create a new comment",
    description: `
    Creates a new comment on a ticket (public or private).
    
    Role-Specific Permissions:
    - Users: Can create public comments on their own tickets
    - Agents: Can create public comments on assigned tickets, private comments on assigned tickets
    - Admins: Can create any type of comment on any ticket
    
    Business Rules:
    1. Private Comments:
       - Only visible to agents/admins
       - Must be created by assigned agent or admin
    
    2. Public Comments:
       - Visible to ticket creator and assigned agent/admin
       - Users can only comment on their own tickets
    
    3. Closed Tickets:
       - No comments allowed (public or private)
    `,
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: commentCreateSchema,
            examples: {
              userPublicComment: {
                summary: "User public comment",
                value: {
                  content: "I'm still experiencing this issue",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                }
              },
              agentPrivateComment: {
                summary: "Agent private comment",
                value: {
                  content: "Need to verify user credentials with admin",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                  isPrivate: true
                }
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: "Comment created successfully",
        content: {
          "application/json": {
            schema: commentSchema,
            examples: {
              publicComment: {
                summary: "Public comment created",
                value: {
                  id: "cmc547s330009u448t6qdc7e3",
                  content: "I'm looking into this issue",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                  userId: "cmc52ncqj0003u4485h53x6jq",
                  createdAt: "2025-06-20T18:00:10.240Z",
                  editedAt: null,
                  deletedAt: null
                }
              },
              privateComment: {
                summary: "Private comment created",
                value: {
                  id: "cmcdf9olg0013u4g09v3559l9",
                  content: "ESCALATION: Unable to resolve this ticket",
                  ticketId: "cmbklatoo03u44ou96eg4g6",
                  userId: "cmc52lbxe0001u4480tokis7d",
                  createdAt: "2025-06-26T13:31:44.450Z",
                  editedAt: null,
                  deletedAt: null
                }
              }
            }
          }
        }
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
                    errors: [],
                    properties: {
                      content: { errors: ["Too small: expected string to have >=2 characters"] },
                      ticketId: { errors: ["Invalid input: expected string, received undefined"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: {
        description: "Permission denied",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string()
            }),
            examples: {

              specificRoleRequired: forbiddenAuthFnResult,
              userPrivateComment: {
                summary: "User trying to create private comment",
                value: {
                  error: "Users cannot create private comments"
                }
              },
              agentWrongTicketOnPrivateComment: {
                summary: "Agent commenting privately on tickets not assigned to them",
                value: {
                  error: "Agents can only add private comments to their assigned tickets"
                }
              },
              userPublicComment: {
                summary: "User trying to comment on other users' tickets",
                value: {
                  error: "You can only comment on your own tickets"
                }
              },
              agentWrongTicketOnPublicComment: {
                summary: "Agent commenting publicly on tickets not assigned to them",
                value: {
                  error: "This ticket is assigned to {agent/admin name} || This ticket is not assigned to any agent"
                }
              }
            }
          }
        }
      },
      404: ticketNotFoundFullExample,
      409: {
        description: "Conflict with ticket state",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string()
            }),
            examples: {
              closedTicket: {
                summary: "Comment on closed ticket",
                value: {
                  error: "This ticket is closed hence comments are not allowed anymore"
                }
              }
            }
          }
        }
      },
      500: commonInternalError("Failed to create comment"),
    }
  });
}