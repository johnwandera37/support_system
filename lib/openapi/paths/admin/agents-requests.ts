import z from "zod/v4";
import { authFnResult, commonInternalError, forbidden403OnlyAuthFnResult, registry } from "../reusableObjects";

export function registerAgentRequests(){
//Agents requests
registry.registerPath({
  method: "get",
  path: "/api/admin/agent-requests",
  tags: ["Admin"],
  summary: "Get list of pending agent applications",
  description: `
    Retrieves all users who have requested to become agents but haven't been approved yet.
    
    Notes:
    - Requires admin privileges
    - Only returns users with wantsToBeAgent=true and isApproved=false
    - Token must be provided in the Authorization header as 'Bearer <token>'
  `,
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of pending agent applications",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({
              example: true,
            }),
            data: z
              .array(
                z.object({
                  id: z.string().openapi({
                    example: "clxyz1234567890abcdefgh",
                  }),
                  name: z.string().openapi({
                    example: "John Doe",
                  }),
                  email: z.string().email().openapi({
                    example: "john@example.com",
                  }),
                  role: z.string().openapi({
                    example: "USER",
                  }),
                  createdAt: z.string().datetime().openapi({
                    example: "2023-07-15T10:30:00Z",
                  }),
                  wantsToBeAgent: z.boolean().openapi({
                    example: true,
                  }),
                  isApproved: z.boolean().openapi({
                    example: false,
                  }),
                })
              )
              .openapi("AgentRequestsList"),
          }),
        },
      },
    },
    401: authFnResult,
    403: forbidden403OnlyAuthFnResult,
    500: commonInternalError("Failed to fetch agent requests"),
  },
});

}
