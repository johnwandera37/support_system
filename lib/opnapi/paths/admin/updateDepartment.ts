import z from "zod/v4";
import { authFnResult, forbiddenAuthFnResult, registry, serverErr1 } from "../reusableObjects";
import { agentProfileSchema } from "@/lib/zodSchema";

export function regigisterUpdateDepartment() {
  registry.registerPath({
    method: "patch",
    path: "/api/admin/agents/{id}/department",
    tags: ["Admin"],
    summary: "Update an agent's department",
    description: `
    Updates the department assignment for a specific approved agent.
    
    Notes:
    - Requires admin privileges
    - Agent must be approved (isApproved=true and wantsToBeAgent=true)
    - Department field is required
    - Token must be provided in the Authorization header as 'Bearer <token>'
  `,
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({
          description: "ID of the agent to update",
          example: "clxyz1234567890abcdefgh",
        }),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              department: z.string().openapi({
                description: "New department assignment for the agent",
                example: "technical-support",
              }),
            }),
            examples: {
              standardUpdate: {
                summary: "Standard department update",
                value: {
                  department: "technical-support",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Department updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({
                example: true,
              }),
              data: agentProfileSchema,
            }),
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Department is required",
              }),
            }),
          },
        },
      },
      401: authFnResult,
      403: forbiddenAuthFnResult,
      404: {
        description: "Agent not found or not approved",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Agent not found or not approved",
              }),
            }),
          },
        },
      },
      500: serverErr1
    },
  });
}
