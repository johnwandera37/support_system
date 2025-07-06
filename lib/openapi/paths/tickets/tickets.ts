import z from "zod/v4";
import {
  authFnResult,
  forbidden403OnlyAuthFnResult,
  registry,
  serverErr1,
} from "../reusableObjects";
import { createTicketSchema, ticketSchema } from "@/lib/zodSchema";
import { zodTreeifiedErrorSchema } from "@/utils/zodErrSchema";

//Get all tickets or specific tickets related to the user who created them
export function regigisterTickets() {
  registry.registerPath({
    method: "get",
    path: "/api/tickets",
    tags: ["Tickets"],
    summary: "Get all tickets",
    description: `
    Retrieves tickets based on user role:
    - Admins/Agents: Get all tickets
    - Regular Users: Only get their own tickets
    
    Notes:
    - Returns tickets with comments included
    - Ordered by creation date (newest first)
    - Requires authentication
  `,
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "List of tickets",
        content: {
          "application/json": {
            schema: z.array(ticketSchema).openapi("TicketList"),
            examples: {
              adminOrAgentView: {
                summary: "Admin/Agent view",
                description:
                  "If comments exists, they include user info of the user who created the ticket, it can be USER, AGENT or ADMIN",
                value: [
                  {
                    id: "cmbklatoo03u44ou96eg4g6",
                    title: "Cannot login",
                    description: "Getting error when trying to login",
                    status: "OPEN",
                    priority: "HIGH",
                    userId: "usr_123",
                    assignedTo: null,
                    createdAt: "2023-07-20T08:45:00Z",
                    updatedAt: "2025-06-11T07:44:24.918Z",
                    escalationReason: null,
                    isEscalated: false,
                    escalatedTo: null,
                    escalatedBy: null,
                    escalatedAt: null,
                    comments: [],
                    privateComments: [],
                  },
                  {
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
                        author: {
                          id: "cmc52lbxe0001u4480tokis7d",
                          name: "Izuku Midoria",
                          role: "AGENT",
                        },
                      },
                    ],
                  },
                ],
              },
              userView: {
                summary: "Regular user view",
                description:
                  "If comments exists, they include a user info of the user who created the ticket, it can be USER, AGENT or ADMIN",
                value: [
                  {
                    id: "cmbklatoo03u44ou96eg4g6",
                    title: "Cannot login",
                    description: "Getting error when trying to login",
                    status: "OPEN",
                    priority: "HIGH",
                    userId: "usr_123",
                    assignedTo: null,
                    createdAt: "2023-07-20T08:45:00Z",
                    updatedAt: "2025-06-11T07:44:24.918Z",
                    escalationReason: null,
                    isEscalated: false,
                    escalatedTo: null,
                    escalatedBy: null,
                    escalatedAt: null,
                    comments: [],
                    privateComments: [],
                  },
                ],
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      500: serverErr1,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/tickets",
    tags: ["Tickets"],
    summary: "Create a new ticket",
    description: `
    Creates a new support ticket.
    
    Notes:
    - Only available to regular users (USER role)
    - Ticket is unassigned when created initially
    - Broadcasts new ticket to all connected agents/admins via socket.io
  `,
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: createTicketSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Ticket created successfully",
        content: {
          "application/json": {
            schema: ticketSchema,
            examples: {
              ticketCreated: {
                summary: "Ticket created successfuly",
                description: "A ticket has been created successfully",
                value: {
                  id: "cmc09b5150001u42ods1ig5r4",
                  title: "Unable to login to my account",
                  description:
                    "When I try to login, I get an error saying 'Invalid credentials' even though I'm sure my password is correct.",
                  status: "OPEN",
                  priority: "HIGH",
                  userId: "cmbklc92i0004u44om90g1vnj",
                  assignedTo: null,
                  createdAt: "2025-06-17T08:23:54.195Z",
                  updatedAt: "2025-06-17T08:23:54.195Z",
                  escalationReason: null,
                  isEscalated: false,
                  escalatedTo: null,
                  escalatedBy: null,
                  escalatedAt: null,
                },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: zodTreeifiedErrorSchema.openapi({
              example: {
                error: {
                  errors: [],
                  properties: {
                    title: {
                      errors: [
                        "Too small: expected string to have >=5 characters",
                      ],
                    },
                    description: {
                      errors: [
                        "Too small: expected string to have >=10 characters",
                      ],
                    },
                    priority: {
                      errors: [
                        'Invalid option: expected one of "LOW"|"MEDIUM"|"HIGH"|"URGENT"',
                      ],
                    },
                  },
                },
              },
            }),
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      500: serverErr1,
    },
  });
}
