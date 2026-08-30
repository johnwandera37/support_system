import z from "zod/v4";
import {
  commonInternalError,
  invalidRefreshTokenExample,
  refreshTokenFromCookieResponseErrors,
  registry,
} from "../reusableObjects";

export function regigisterLogout() {
  registry.registerPath({
    method: "post",
    path: "/api/auth/logout",
    tags: ["Authentication"],
    summary: "Logout user and invalidate session",
    description: `
    Invalidates the current session by:
    1. Deleting the refresh token from Redis
    2. Clearing both access and refresh token cookies
    
    Notes:
    - Requires a valid refresh_token cookie
    - Clears both access and refresh tokens from client via cookie invalidation
    - Immediately revokes server-side session
  `,
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Logout successful - Session invalidated",
        headers: {
          "Set-Cookie": {
            schema: {
              type: "string",
            },
            example: [
              "access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0, Expires=Thu, 01 Jan 1970 00:00:00 GMT",
              "refresh_token=; Path=/; HttpOnly; SameSite=Lax;  Max-Age=0, Expires=Thu, 01 Jan 1970 00:00:00 GMT",
            ],
          },
        },
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({
                example: "Logout successful",
              }),
            }),
            examples: {
              success: {
                value: {
                  success: true,
                  message: "Logout successful",
                },
              },
            },
          },
        },
      },
      401: {
        description: "Authentication failed - Missing authentication cookie and refresh token | Invalid refresh token",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Missing authentication cookies",
              }),
            }),
            examples: {
              ...refreshTokenFromCookieResponseErrors,
              invalidRefreshToken: invalidRefreshTokenExample,
            },
          },
        },
      },
      500: commonInternalError("Logout failed with unhandled exception"),
    },
  });
}
