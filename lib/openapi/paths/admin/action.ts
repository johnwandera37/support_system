import { z } from "zod/v4";
import { authFnResult, commonInternalError, forbiddenAuthFnResult, registry } from "../reusableObjects";
import { adminActionSchema, zodTreeifiedErrorSchema } from "@/lib/zodSchema";

export function registerAdminActionPaths() {

  registry.registerPath({
    method: "post",
    path: "/api/admin/action",
    tags: ["Admin"],
    summary: "Perform administrative user role actions",
    description: `
    Allows administrators to manage user roles and approvals. 
    Requires admin privileges (verified via JWT token).
    
    Notes:
    - All successful actions trigger email notifications to the affected user
    - Self-actions (modifying your own role) are forbidden
    - Token must be provided in the Authorization header as 'Bearer <token>'
  `,
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: adminActionSchema,
            examples: {
              approve: {
                summary: "Approve agent application",
                value: {
                  action: "approve",
                  userId: "clxyz1234567890abcdefgh",
                  department: "Technical Support",
                },
              },
              promote: {
                summary: "Promote to admin",
                value: {
                  action: "promote",
                  userId: "clxyz1234567890abcdefgh",
                },
              },
              demote: {
                summary: "Demote to agent",
                value: {
                  action: "demote",
                  userId: "clxyz1234567890abcdefgh",
                  targetRole: "AGENT",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Action completed successfully. Email notification sent to user (or noted as failed).",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({ example: "Promote action completed successfully." }),
            }),
            examples: {
              success: { value: { success: true, message: "Promote action completed successfully." } },
              emailFailed: {
                summary: "Action succeeded, notification email failed",
                value: { success: true, message: "Approve action completed successfully, but the notification email failed to send." },
              },
            },
          },
        },
      },
      400: {
        description: "Body failed Zod validation, or a business rule was violated",
        content: {
          "application/json": {
            schema: z.union([zodTreeifiedErrorSchema, z.object({ error: z.string() })]),
            examples: {
              zodErrors: {
                summary: "Invalid action / userId / targetRole shape",
                value: {
                  error: {
                    errors: [],
                    properties: { action: { errors: ['Invalid option: expected one of "approve"|"promote"|"demote"'] } },
                  },
                },
              },
              notPendingApproval: {
                summary: "Not pending approval",
                value: { error: "User is not pending approval" },
              },
              alreadyAdmin: {
                summary: "Already an admin",
                value: { error: "User is already an admin" },
              },
              notAdminOrAgent: {
                summary: "Target is not an admin or agent",
                description: "Demote attempted on a plain USER",
                value: { error: "User is not an admin or agent" },
              },
              missingTargetRole: {
                summary: "Missing targetRole for demote",
                value: { error: "targetRole is required for demote" },
              },
              alreadyAgent: {
                summary: "Already an agent",
                description: "Demote attempted with targetRole=AGENT on a user who is already an AGENT",
                value: { error: "User is already an agent" },
              },
            },
          },
        },
      },
      401: authFnResult,
      403: {
        description: "Authorization failed",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Forbidden - Admin access required",
              }),
            }),
            examples: {
              adminRequired: forbiddenAuthFnResult,
              selfAction: {
                summary: "Self-action prevention",
                description: "Occurs when admin tries to modify their own role",
                value: {
                  error: "You cannot approve, promote, or demote yourself",
                },
              },
            },
          },
        },
      },
      404: {
        description: "Target user not found",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "User not found",
              }),
            }),
          },
        },
      },
      500: {
        description: "Internal server error — unhandled failure while performing the requested action",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "promote action failed" }),
            }),
            examples: {
              approveFailed: {
                summary: "Unhandled failure during approve",
                value: { error: "approve action failed" },
              },
              promoteFailed: {
                summary: "Unhandled failure during promote",
                value: { error: "promote action failed" },
              },
              demoteFailed: {
                summary: "Unhandled failure during demote",
                value: { error: "demote action failed" },
              },
            },
          },
        },
      },
    },
  });
}
