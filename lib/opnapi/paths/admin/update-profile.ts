import z from "zod/v4";
import {
  getUserDataFromATerr,
  getUserDataFromATerrExamples,
  refreshTokenFromCookieResponseErrors,
  registry,
  serverErr3,
} from "../reusableObjects";
import { updateProfileSchema } from "@/lib/zodSchema";
import { zodTreeifiedErrorSchema } from "@/utils/zodErrSchema";

export function regigisterUpdateProfile() {
  registry.registerPath({
    method: "patch",
    path: "/api/admin/update-profile",
    tags: ["Admin"],
    summary: "Force-update initial admin credentials",
    description: `
    Mandatory credential update after first login with seeded admin account.
    Rejects requests until default credentials are changed.
    
    Flow:
    1. Login with seeded credentials
    2. Forced redirect to credential update
    3. Submit new credentials
    4. Automatic logout, redis sessions and cookies are cleared for the default admin
    5. Re-login with new credentials
  `,
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: updateProfileSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: `
    Credentials updated - requires reauthentication
    
    Security Actions:
    1. All active sessions for this admin are invalidated in Redis
    2. Authentication cookies are cleared client-side
    3. Subsequent requests will require fresh login
    
    Note: If Redis session cleanup fails (e.g. connection issue), 
    credentials are still updated but some sessions may remain active temporarily`,
        headers: {
          "Set-Cookie": {
            schema: {
              type: "string",
              example: [
                "access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0, Expires=Thu, 01 Jan 1970 00:00:00 GMT",
                "refresh_token=; Path=/; HttpOnly; SameSite=Lax;  Max-Age=0, Expires=Thu, 01 Jan 1970 00:00:00 GMT",
              ],
            },
          },
        },
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({
                example: "Credentials updated. Please login again",
              }),
              requiresReauth: z.boolean().openapi({ example: true }),
            }),
            examples: {
              success: {
                summary: "Successful credential update",
                value: {
                  success: true,
                  message: "Credentials updated. Please login again",
                  data: { requiresReauth: true }
                },
              },
              redisWarning: {
                summary: "Credentials updated with Redis warning",
                description:
                  "Occurs when credentials were updated but session cleanup failed",
                value: {
                  success: true,
                  message:
                    "Credentials updated. Some sessions may remain active",
                  data: { requiresReauth: true }
                },
              },
            },
          },
        },
      },
      401: {
        description:
          " Unauthorized - Missing or invalid token | Current password verification failed | Missing authentication cookie and refresh token",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example:
                  "Current password incorrect, Use the initially seeded credentials",
              }),
            }),
            //examples
            examples: {
              ...getUserDataFromATerrExamples,
              incorrectPassword: {
                summary: "Incorrect current password",
                description:
                  "If current password does not match the default password",
                value: {
                  error:
                    "Current password incorrect, Use the initially seeded credentials",
                },
              },
              ...refreshTokenFromCookieResponseErrors,
            },
          },
        },
      },
      403: {
        description: "Authorizations",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Unauthorized",
              }),
            }),

            examples: {
              adminAccessRequired: {
                summary: "Admin access required",
                description:
                  "Only first time login admin is required to perform this action",
                value: {
                  error: "Unauthorized, Admin access required",
                },
              },
              defaultAdminForbidden: {
                summary: "Security Policy Violations",
                description:
                  "Admin is required to update the default admin email to their real admin email",
                value: {
                  error: "Must change default admin email",
                },
              },
            },
          },
        },
      },
      404: {
        description: "Admin profile was updated or not seeded initially",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example:
                  "Default Admin account not found, either it was updated or not seeded initially",
              }),
            }),
          },
        },
      },
      409: {
        description: "Conflicts related to same email",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Email already in use by another account",
              }),
            }),
          },
        },
      },
      422: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: zodTreeifiedErrorSchema.openapi({
              example: {
                error: {
                  errors: [],
                  properties: {
                    email: {
                      errors: ["Invalid email format"],
                    },
                    password: {
                      errors: [
                        "Password must be at least 8 characters",
                        "Must contain at least one number",
                        "Must contain at least one uppercase letter",
                      ],
                    },
                    currentPassword: {
                      errors: ["Current default password is required"],
                    },
                  },
                },
              },
            }),
          },
        },
      },

      500: serverErr3,
    },
  });
}
