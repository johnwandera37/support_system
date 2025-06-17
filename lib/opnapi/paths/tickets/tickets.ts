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
                value: [
                  {
                    id: "cmbklatoo03u44ou96eg4g6",
                    title: "Cannot login",
                    description: "Getting error when trying to login",
                    status: "OPEN",
                    priority: "HIGH",
                    userId: "usr_123",
                    assignedTo: "cmbklatoo0003u44ou9og4g64",
                    createdAt: "2023-07-20T08:45:00Z",
                    updatedAt: "2025-06-11T07:44:24.918Z",
                    comments: [],
                  },
                  {
                    id: "cmbklatoo0644ou96773g6",
                    title: "Payment issue",
                    description: "Payment not processing",
                    status: "PENDING",
                    priority: "MEDIUM",
                    userId: "usr_456",
                    assignedTo: "cmbklatoo0003u44ou9og4g64wuwuw",
                    createdAt: "2023-07-18T10:30:00Z",
                    updatedAt: "2025-06-11T07:44:24.918Z",
                    comments: [],
                  },
                ],
              },
              userView: {
                summary: "Regular user view",
                value: [
                  {
                    id: "cmbklatoo0644ou96773g6",
                    title: "Payment issue",
                    description: "Payment not processing",
                    status: "PENDING",
                    priority: "MEDIUM",
                    userId: "usr_456",
                    assignedTo: "cmbklatoo0003u44ou9og4g64wuwuw",
                    createdAt: "2023-07-18T10:30:00Z",
                    updatedAt: "2025-06-11T07:44:24.918Z",
                    comments: [],
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
