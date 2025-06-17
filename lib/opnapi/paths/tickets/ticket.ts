import z from "zod/v4";
import {
  authFnResult,
  forbidden403OnlyAuthFnResult,
  registry,
  serverErr1,
  ticketNotFoundFullExample,
} from "../reusableObjects";
import {
  commentSchema,
  ticketSchema,
  ticketUpdateSchema,
} from "@/lib/zodSchema";
import { zodTreeifiedErrorSchema } from "@/utils/zodErrSchema";

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
            schema: ticketSchema.extend({
              comments: z.array(commentSchema),
            }),
            examples: {
              userTicket: {
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
                  comments: [],
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      404: ticketNotFoundFullExample,
      500: serverErr1,
    },
  });

  // PATCH /api/tickets/{id}
  registry.registerPath({
    method: "patch",
    path: "/api/tickets/{id}",
    tags: ["Tickets"],
    summary: "Update a ticket",
    description: `
    Updates ticket status or assignment (Admin/Agent only).
    
    Notes:
    - Only admins/agents can update tickets
    - Agents can only assign tickets to themselves
    - Admin can assigned tickets to themselves or other agents
    - Reassignement of the same ticket is not allowed
    - Validates (assignedTo expected user id) if user exists first before assigning a ticket to agent/admin
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
              updatedTicket: {
                value: {
                  id: "cmbklatoo7864484u97474848",
                  title: "Login issue",
                  description: "Can't access my account",
                  status: "PENDING",
                  priority: "HIGH",
                  userId: "cmbrllnxm0001u46cuyz3538",
                  assignedTo: "cmbrllnxm0001u46cuyz7899",
                  createdAt: "2023-07-20T08:45:00Z",
                  updatedAt: "2023-07-21T09:30:00Z",
                },
              },
            },
          },
        },
      },
      400: {
        description: "Fields Validation error | Ticket assignemnt errors",
        content: {
          "application/json": {
            schema: zodTreeifiedErrorSchema.openapi({
              example: {
                error: {
                  errors: [],
                  properties: {
                    status: {
                      errors: [
                        'Invalid option: expected one of "OPEN"|"PENDING"|"RESOLVED"|"CLOSED"',
                      ],
                    },
                    assignedTo: {
                      errors: [
                        "Invalid input: expected string, received number",
                      ],
                    },
                  },
                },
              },
            }),
            examples: {
              invalidAssignment: {
                summary: "Invalid user id assignemnt",
                description:
                  "If assignedTo is provided, the id has to be valdated if it exists",
                value: {
                  error: "Assigned user not found or not an agent/admin",
                },
              },
              selfAssignmentOnly: {
                summary: "Self assignements only",
                description:
                  "Agents are only allowed to assigned tickets to themselves",
                value: {
                  error: "Agents can only assign tickets to themselves",
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
                description:
                  "Reassignement is not allowed",
                value: {
                  error:
                    "This ticket has already been assigned to the agent or admin",
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      404: ticketNotFoundFullExample,
      500: serverErr1,
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
              message: z.string().openapi({
                example: "Deleted",
              }),
            }),
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      404: ticketNotFoundFullExample,
      500: serverErr1,
    },
  });
}
