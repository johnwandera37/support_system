import z from "zod/v4";
import { authFnResult, commonInternalError, forbiddenAuthFnResult, registry } from "../reusableObjects";
import { agentProfileSchema, updateAgentDepartmentSchema, zodTreeifiedErrorSchema } from "@/lib/zodSchema";

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
            schema: updateAgentDepartmentSchema,
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
              message: z.string().openapi({ example: "Agent department updated successfully" }),
              data: agentProfileSchema,
            }),
          },
        },
      },
      400: {
        description: "Request body is not valid JSON, or department failed schema validation",
        content: {
          "application/json": {
            schema: z.union([zodTreeifiedErrorSchema, z.object({ error: z.string() })]),
            examples: {
              invalidJson: {
                summary: "Malformed JSON body",
                value: { error: "Request body must be valid JSON" },
              },
              zodError: {
                summary: "Missing or invalid department field",
                value: { error: { errors: [], properties: { department: { errors: ["The department field is required"] } } } },
              },
            },
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
      500: commonInternalError("Failed to update agent department"),
    },
  });
}
