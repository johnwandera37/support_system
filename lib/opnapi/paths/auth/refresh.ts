import z from "zod/v4";
import { invalidRefreshTokenExample, refreshTokenFromCookieResponseErrors, registry } from "../reusableObjects";

export function regigisterRefresh() {
  registry.registerPath({
    method: "post",
    path: "/api/auth/refresh",
    tags: ["Authentication"],
    security: [{ cookieAuth: [] }], // Override default security
    summary: "Refresh access token using refresh token",
    description: `
    Generates a new access token when provided with a valid refresh token.
    
    Notes:
    - Requires a valid refresh_token cookie
    - Verifies token against Redis session store
    - Returns new access token as HTTP-only cookie
    - Supports multiple device sessions via sessionId
    - Access token expires in 15 minutes
  `,
    responses: {
      200: {
        description: "Access token refreshed successfully",
        headers: {
          "Set-Cookie": {
            schema: {
              type: "string",
              example:
                "access_token=newToken.abc.123; Path=/; HttpOnly; Max-Age=900",
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
              invalidToken: invalidRefreshTokenExample,
            },
          },
        },
      },
      403: {
        description: "Session expired",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Session expired",
              }),
            }),
          },
        },
      },
    },
  });
}
