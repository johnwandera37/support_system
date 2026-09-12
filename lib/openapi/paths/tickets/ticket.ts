import z from "zod/v4";
import {
  authFnResult,
  commonInternalError,
  forbidden403OnlyAuthFnResult,
  forbiddenAuthFnResult,
  registry,
  ticketNotFoundFullExample,
} from "../reusableObjects";
import {
  commentSchema,
  ticketSchema,
  ticketUpdateSchema,
  ticketWithCommentsSchema,
  zodTreeifiedErrorSchema,
} from "@/lib/zodSchema";

export function regigisterTicket() {
  // GET /api/tickets/{id}
  registry.registerPath({
    method: "get",
    path: "/api/tickets/{id}",
    tags: ["Tickets"],
    summary: "Get a specific ticket",
    description: `
    Retrieves a single ticket by ID with comments included.
    
    Notes:
    - Admins/Agents: Can view any ticket
    - Regular Users: Can only view their own tickets
    - Returns 404 if ticket doesn't exist or user lacks permission
  `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "cmbklatoo7864484u96773g6",
          description: "ID of the ticket to retrieve",
        }),
      }),
    },
    responses: {
      200: {
        description: "Ticket details with comments",
        content: {
          "application/json": {
            schema: ticketWithCommentsSchema,
            examples: {
              userTicket: {
                summary: "User ticket created",
                value: {
                  id: "cmbklatoo7864484u96773g6",
                  title: "Login issue",
                  description: "Can't access my account",
                  status: "OPEN",
                  priority: "HIGH",
                  userId: "cmbklatoo7874484u984990",
                  assignedTo: null,
                  createdAt: "2023-07-20T08:45:00Z",
                  updatedAt: "2023-07-20T08:45:00Z",
                  escalationReason: null,
                  isEscalated: false,
                  escalatedTo: null,
                  escalatedBy: null,
                  escalatedAt: null,
                  comments: [],
                  privateComments: [],
                },
              },

              userTicketWithComments: {
                summary: "User ticket that has comments",
                description:
                  "The comments include a user info of the user who created the ticket, it can be USER, AGENT or ADMIN",
                value: {
                  id: "cmc53b1zf0007u448m37zy672",
                  title: "Account Error",
                  description:
                    "When I try to login I get the account error message.",
                  status: "OPEN",
                  priority: "HIGH",
                  userId: "cmc52ncqj0003u4485h53x6jq",
                  assignedTo: "cmbklatoo0003u44ou9og4g64",
                  createdAt: "2025-06-20T17:34:43.539Z",
                  updatedAt: "2025-06-20T17:34:43.539Z",
                  comments: [
                    {
                      id: "cmc547s330009u448t6qdc7e3",
                      content:
                        "I'm taking a look into your issue, will get back to you as soon as possible",
                      ticketId: "cmc53b1zf0007u448m37zy672",
                      userId: "cmc52ncqj0003u4485h53x6jq",
                      createdAt: "2025-06-20T18:00:10.240Z",
                      editedAt: null,
                      deletedAt: null,
                      user: {
                        id: "cmc52ncqj0003u4485h53x6jq",
                        name: "Mighty Guy",
                        role: "USER",
                      },
                    },
                  ],
                  privateComments: [
                    {
                      id: "cmcdf9olg0013u4g09v3559l9",
                      content: "ESCALATION: Unable to complete this ticket",
                      ticketId: "cmc5341d90005u44858udwnda",
                      userId: "cmc52lbxe0001u4480tokis7d",
                      createdAt: "2025-06-26T13:31:44.450Z",
                      editedAt: null,
                      deletedAt: null,
                      user: {
                        id: "cmc52lbxe0001u4480tokis7d",
                        name: "Izuku Midoria",
                        role: "AGENT",
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      404: ticketNotFoundFullExample,
      500: commonInternalError("Failed to fetch ticket"),
    },
  });

  // PATCH /api/tickets/{id}
  registry.registerPath({
    method: "patch",
    path: "/api/tickets/{id}",
    tags: ["Tickets"],
    summary: "Update a ticket",
    description: `
Updates ticket. Behavior differs by role.

- USERs may only update the priority field on their own tickets.
- AGENTs must be the ticket's assigned agent to make any change,
  with one exception: an AGENT may self-assign a currently
  unassigned ticket.
- ADMINs may act on any ticket, though reassigning an escalated
  ticket is restricted to the specific admin it was escalated to.

  
  Role-Specific Permissions:
  - Users: Can only update priority of their own tickets
  - Agents: Can update status, self-assign, and escalate tickets
  - Admins: Full update capabilities including reassignment of escalated tickets

  Business Rules:
  1. Priority Updates:
     - Users can modify priority at any time
     - Agents/Admins cannot modify priority (frontend should hide this option)
  
  2. Status Transitions:
     - Tickets can only be closed if status is RESOLVED
     - Only PENDING tickets can be escalated
     - RESOLVED tickets can be reopened by assigned agent or admin
  
  3. Assignment Rules:
     - Agents can only self-assign unassigned tickets
     - Admins can assign to any agent/admin
     - Reassignment requires escalation
  
  4. Escalation Requirements:
     - Must provide escalation reason (10-500 chars)
     - Must specify target admin
     - Creates private comment and notifications
  
  5. History Tracking:
     - All status changes and assignments are logged
     - Notifications sent for important changes

     N/B
     _root is a new reserved key across any strict schema in all the APIs, 
     it has been used here to strictly excludes fields that are not defined in the schema
  `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "cmbklatoo7864484u97474848",
          description: "ID of the ticket to update",
        }),
      }),
      body: {
        content: {
          "application/json": {
            schema: ticketUpdateSchema,
            examples: {
              userPriorityUpdate: {
                summary: "User priority update",
                value: {
                  priority: "HIGH",
                },
              },
              agentStatusUpdate: {
                summary: "Agent status update",
                value: {
                  status: "RESOLVED",
                },
              },
              statusUpdate: {
                summary: "Status update",
                value: {
                  status: "PENDING",
                },
              },

              assignToSelf: {
                summary: "Agent self-assignment",
                value: {
                  assignedTo: "cmbrllnxm0001u46cuyz7899",
                },
              },
              adminAssignment: {
                summary:
                  "Admin can assigned tickets to themselves or other agents",
                value: {
                  assignedTo: "cmbrllnxm0001u46cuyz7899",
                },
              },

              ticketEscalation: {
                summary: "Ticket escalation",
                value: {
                  isEscalated: true,
                  escalationReason: "Need admin approval for refund",
                  escalatedTo: "cmbrllnxm0003u46cuyz7899", // Admin ID
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Ticket updated successfully",
        content: {
          "application/json": {
            schema: ticketSchema,
            examples: {
              userPriorityUpdate: {
                summary: "User priorty update",
                value: {
                  id: "cmbklatoo7864484u97474848",
                  title: "Login issue",
                  description: "Can't access my account",
                  status: "OPEN",
                  priority: "HIGH", // Updated priority
                  userId: "cmbrllnxm0001u46cuyz3538",
                  assignedTo: null,
                  createdAt: "2023-07-20T08:45:00Z",
                  updatedAt: "2023-07-21T09:30:00Z",
                  escalationReason: null,
                  isEscalated: false,
                  escalatedTo: null,
                  escalatedBy: null,
                  escalatedAt: null,
                },
              },
              agentAssignment: {
                summary: "Agent assignment",
                value: {
                  id: "cmbklatoo7864484u97474848",
                  title: "Login issue",
                  description: "Can't access my account",
                  status: "PENDING", // Auto-updated on assignment
                  priority: "MEDIUM",
                  userId: "cmbrllnxm0001u46cuyz3538",
                  assignedTo: "cmbrllnxm0001u46cuyz7899",
                  createdAt: "2023-07-20T08:45:00Z",
                  updatedAt: "2023-07-21T09:30:00Z",
                  escalationReason: null,
                  isEscalated: false,
                  escalatedTo: null,
                  escalatedBy: null,
                  escalatedAt: null,
                },
              },
              escalatedTicket: {
                summary: "Escalated ticket",
                value: {
                  id: "cmbklatoo7864484u97474848",
                  title: "Login issue",
                  description: "Can't access my account",
                  status: "PENDING",
                  priority: "MEDIUM",
                  userId: "cmbrllnxm0001u46cuyz3538",
                  assignedTo: "cmbrllnxm0001u46cuyz7899",
                  isEscalated: true,
                  escalationReason: "Need admin approval for refund",
                  escalatedTo: "cmbrllnxm0003u46cuyz7899",
                  escalatedBy: "cmbrllnxm0001u46cuyz7899",
                  escalatedAt: "2023-07-21T10:15:00Z",
                  createdAt: "2023-07-20T08:45:00Z",
                  updatedAt: "2023-07-21T10:15:00Z",
                },
              },
            },
          },
        },
      },
      400: {
        description: "Fields Validation error  (including unrecognized fields — the schema is strict) | Malformed JSON | Ticket assignment/business-rule errors",
        content: {
          "application/json": {
            schema: z.union([
              // Zod validation errors
              zodTreeifiedErrorSchema,
              // Custom business rule errors
              z.object({
                error: z.string(),
              }),
            ]),
            examples: {
              invalidJson: {
                summary: "Malformed request body",
                value: { error: "Request body must be valid JSON" },
              },
              unrecognizedField: {
                summary: "Unknown field submitted (e.g. title/description)",
                description: "USER and AGENT/ADMIN cannot update title or description via PATCH — only fields defined on the update schema are accepted",
                value: {
                  error: { _root: ['Unrecognized key: "title"'] },
                  message: ['Unrecognized key: "title"'],
                },
              },
              // Zod errors from body
              zodErrors: {
                summary: "Invalid priority | status",
                value: {
                  error: {
                    errors: [],
                    properties: {
                      priority: {
                        errors: [
                          'Invalid option: expected one of "OPEN"|"PENDING"|"RESOLVED"|"CLOSED"',
                          'Invalid option: expected one of "LOW"|"MEDIUM"|"HIGH"',
                        ],
                      },
                    },
                  },
                },
              },

              // status transition
              invalidStatusTransition: {
                summary: "Ticket must resolved to close",
                value: {
                  error: "Ticket must be RESOLVED before closing",
                },
              },

              // ticket assignment
              invalidAssignee: {
                summary: "Invalid assignee id",
                value: {
                  error: "Invalid assignee",
                },
              },
              selfReassignment: {
                summary: "Attempt to reassign the same ticket",
                description: "Reassignment is not allowed",
                value: {
                  error: "You have already assigned yourself this ticket",
                },
              },
              ticketReassignment: {
                summary: "Ticket reassignment (Admin)",
                description: "Reassignement is not allowed",
                value: {
                  error:
                    "This ticket has already been assigned to agent/admin name",
                },
              },
              blockAssignedTicket: {
                summary: "Block an assigned ticket by agent",
                description:
                  "Let the agent know who is handling the ticket they try to assigned to themselves",
                value: {
                  error:
                    "This ticket is already being handled by agent/admin name",
                },
              },
              blockAdminReassignment: {
                summary: "Block admin reassigning non-escalated tickets",
                description:
                  "If the user who is handling this ticket has not escalated it then reassignment by admin is forbidden",
                value: {
                  error:
                    "The current assignee, {handler name}, has not escalated this ticket, therefore reassignment is not possible",
                },
              },

              // escalaation
              escalatinOnPendingTickets: {
                summary: "Ticket Must be pending to be escalated",
                value: {
                  error: "Only PENDING tickets can be escalated",
                },
              },
              escalationRequirements: {
                summary: "Missing escalation fields",
                value: {
                  error: "Escalation reason is required",
                },
              },
              adminSelection: {
                summary: "An admin must be selected",
                description:
                  "The one escalating must choose an admin to select the ticket to",
                value: {
                  error: "Please select an admin to escalate to",
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: {
        description: "Authorization failures",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "You can only update your own tickets",
              }),
            }),
            examples: {
              specifiedRoleRequired: forbiddenAuthFnResult,
              userTicketAccess: {
                summary: "User have access to their tickets only",
                value: {
                  error: "You can only update your own tickets",
                },
              },
              userUpdatePermission: {
                summary: "Update ticket priority",
                value: {
                  error: "Users can only update ticket priority",
                },
              },
              agentAssignment: {
                summary: "Agent trying to assign to another user",
                value: {
                  error: "Agents can only assign tickets to themselves",
                },
              },
              adminReassignment: {
                summary: "Admin trying to reassign non-escalated ticket",
                value: {
                  error: "Only escalated tickets can be reassigned",
                },
              },
              notAssignedAgent: {
                summary: "Agent not assigned to this ticket",
                description: "An AGENT attempted to modify a ticket that isn't assigned to them (self-assigning an unassigned ticket is still allowed)",
                value: { error: "Only the agent assigned to this ticket can make this update" },
              },
            },
          },
        },
      },
      404: {
        description: "Ticket not found, or selected admin for escalation not found/not available",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
            examples: {
              ticketNotFound: {
                value: { error: "Ticket not found" },
              },
              adminNotFound: {
                summary: "Selected admin not found",
                description: "The admin selected for escalation has not been found or is not available",
                value: { error: "Selected admin not found or not available" },
              },
            },
          },
        },
      },
      409: {
        description: "Conflict with current ticket state",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example:
                  "This ticket does not need further actions. It has been closed",
              }),
            }),
            examples: {
              alreadyClosed: {
                summary: "Modifying closed ticket",
                value: {
                  error:
                    "This ticket does not need further actions. It has been closed.",
                },
              },
              noFurtherActionOnResolved: {
                summary: "No further actions on resolved ticket",
                value: {
                  error:
                    "This ticket does not need further actions. You/AssigneeName should mark it as closed if completed.",
                },
              },
              alreadyEscalated: {
                summary: "Already escalated tickets",
                value: {
                  error:
                    "This ticket has been escalated to an admin and cannot be escalated again.",
                },
              },
            },
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
            examples: {
              updateFailed: {
                summary: "Unhandled failure updating the ticket",
                value: { error: "Failed to update ticket" },
              },
              escalationFailed: {
                summary: "Unhandled failure during the escalation transaction",
                value: { error: "Failed to escalate ticket" },
              },
            },
          },
        },
      },
    },
  });

  // DELETE /api/tickets/{id}
  registry.registerPath({
    method: "delete",
    path: "/api/tickets/{id}",
    tags: ["Tickets"],
    summary: "Delete a ticket",
    description: `
    Permanently deletes a ticket (Admin only).
    
    Notes:
    - Only admins can delete tickets
    - Returns simple success message
  `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "cmbrllnxm0001u46cuy7839",
          description: "ID of the ticket to delete",
        }),
      }),
    },
    responses: {
      200: {
        description: "Ticket deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({
                example: "Ticket deleted successfully",
              }),
            }),
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      404: ticketNotFoundFullExample,
      500: commonInternalError("Failed to delete ticket"),
    },
  });
}
