import { z } from "zod/v4";
import { authFnResult, forbiddenAuthFnResult, registry, serverErr1 } from "../reusableObjects";

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
            schema: z.object({
              action: z.enum(["approve", "promote", "demote"]).openapi({
                description: "Type of administrative action to perform",
                example: "promote",
              }),
              userId: z.string().openapi({
                description: "ID of the target user",
                example: "clxyz1234567890abcdefgh",
              }),
              department: z.string().optional().openapi({
                description:
                  "Required for 'approve' action - department for new agent",
                example: "Technical Support",
              }),
              targetRole: z.enum(["AGENT", "USER"]).optional().openapi({
                description:
                  "Required for 'demote' action - target role after demotion",
                example: "AGENT",
              }),
            }),
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
        description:
          "Action completed successfully. Email notification sent to user.",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string().openapi({
                example: "Promote action completed successfully.",
              }),
            }),
          },
        },
      },
      400: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Invalid request",
              }),
            }),
            examples: {
              invalidRequest: {
                summary: "Invalid reguest",
                description:
                  "If either userId or action is not provided in body",
                value: {
                  error: "Invalid request",
                },
              },
              notPendingApproval: {
                summary: "Not pending approval",
                description:
                  "If approve action is performed on a user who is already approved",
                value: {
                  error: "User is not pending approval",
                },
              },
              alreadyAdmin: {
                summary: "Already an admin",
                description:
                  "If promotion action is attempted on a user that is already an admin",
                value: {
                  error: "User is already an admin",
                },
              },
              invalidTargetRole: {
                summary: "Invalid target role",
                description:
                  "If no target role is provided for demotion action",
                value: {
                  error: "Invalid or missing targetRole",
                },
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
      500: serverErr1,
    },
  });
}
