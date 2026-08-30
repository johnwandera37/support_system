import z from "zod/v4";
import { commonInternalError, invalidRefreshTokenExample, refreshTokenFromCookieResponseErrors, registry } from "../reusableObjects";

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
              example: "access_token=newToken.abc.123; Path=/; HttpOnly; Max-Age=900",
            },
          },
        },
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean().openapi({ example: true }) }),
          },
        },
      },
      401: {
        description:
          "Missing authentication cookie/refresh token | Invalid or expired refresh token JWT | Unrecognized Redis error during session validation",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "You need to be logged in to continue." }),
            }),
            examples: {
              ...refreshTokenFromCookieResponseErrors,
              invalidRefreshToken: invalidRefreshTokenExample,
              sessionValidationFailed: {
                summary: "Unrecognized Redis error",
                description: "Redis threw something not classified as a known RedisError code",
                value: { error: "Session validation failed" },
              },
            },
          },
        },
      },
      403: {
        description: "JWT valid but session revoked or mismatched in Redis",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "Session expired. Please log in again." }),
            }),
            examples: {
              sessionMismatch: {
                summary: "Session expired (Redis-level)",
                description: "Refresh token not found in Redis or doesn't match the stored value",
                value: { error: "Session expired. Please log in again." },
              },
            },
          },
        },
      },
      500: commonInternalError("Internal server error"), // REDIS_AUTH_FAILED / REDIS_CONFIG_INCOMPLETE via handleRedisError
      503: {
        description: "Redis temporarily unavailable",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "Temporary service unavailable. Please try again shortly." }),
            }),
          },
        },
      },
    },
  });
}
