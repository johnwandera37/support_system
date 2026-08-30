import z from "zod/v4";
import { registry } from "../reusableObjects";

export function registerAccessTokenRoute() {
  registry.registerPath({
    method: "get",
    path: "/api/auth/access-token",
    tags: ["Authentication"],
    security: [{ cookieAuth: [] }],
    summary: "Get access token from cookie",
    description: `
Retrieves the current access token from the "access_token" cookie.

Notes:
- Requires a valid access_token cookie
- Intended for debugging or client-side token management (if allowed)
- If cookie is missing or expired, returns 401
    `,
    responses: {
      200: {
        description: "Access token retrieved successfully",
        content: {
          "application/json": {
            schema: z.object({
              token: z.string().openapi({
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              }),
            }),
          },
        },
      },
      400: {
        description: "Token present but malformed or missing expiry claim",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "Invalid token" }),
            }),
          },
        },
      },
      401: {
        description: "Missing or invalid access token cookie",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "No access token",
              }),
            }),
          },
        },
      },
    },
  });
}
