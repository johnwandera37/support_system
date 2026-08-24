import z from "zod/v4";
import { authFnResult, forbidden403OnlyAuthFnResult, registry, serverErr2 } from "../reusableObjects";
import { agentsListSchema } from "@/lib/zodSchema";

export function registerAgents() {
  //agents
  registry.registerPath({
    method: "get",
    path: "/api/admin/agents",
    tags: ["Admin"],
    summary: "Get list of approved agents",
    description: `
    Retrieves all approved agents. Can be filtered by department.
    
    Notes: 
    - Requires admin privileges
    - Only returns users with isApproved=true and role=AGENT
    - Optional department filter available
    - Token must be provided in the Authorization header as 'Bearer <token>'
  `,
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        department: z.string().optional().openapi({
          param: {
            name: "department",
            in: "query",
          },
          description: "Filter agents by department",
          example: "support",
        }),
      }),
    },
    responses: {
      200: {
        description: "List of approved agents",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({
                example: true,
              }),
              data: agentsListSchema,
            }),
            examples: {
              allAgents: {
                summary: "All agents",
                value: {
                  success: true,
                  data: [
                    {
                      id: "clxyz1234567890abcdefgh",
                      name: "Jane Smith",
                      email: "jane@example.com",
                      role: "AGENT",
                      createdAt: "2023-07-20T08:45:00Z",
                      agentProfile: {
                        department: "support",
                      },
                    },
                    {
                      id: "clxyz9876543210abcdefgh",
                      name: "John Doe",
                      email: "john@example.com",
                      role: "AGENT",
                      createdAt: "2023-07-18T10:30:00Z",
                      agentProfile: {
                        department: "technical",
                      },
                    },
                  ],
                },
              },
              filteredAgents: {
                summary: "Filtered by department",
                value: {
                  success: true,
                  data: [
                    {
                      id: "clxyz1234567890abcdefgh",
                      name: "Jane Smith",
                      email: "jane@example.com",
                      role: "AGENT",
                      createdAt: "2023-07-20T08:45:00Z",
                      agentProfile: {
                        department: "support",
                      },
                    },
                  ],
                },
              },
              invalidDepParameter: {
                summary: "Invalid department parameter",
                value: {
                  success: true,
                  data: [],
                },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      500: serverErr2,
    },
  });

}
