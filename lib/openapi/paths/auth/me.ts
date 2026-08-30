import z from "zod/v4";
import { authFnResult, commonInternalError, registry } from "../reusableObjects";

export function registerMeRoute() {
  registry.registerPath({
    method: "get",
    path: "/api/auth/me",
    tags: ["Authentication"],
    security: [{ cookieAuth: [] }],
    summary: "Get current authenticated user",
    description: `
Returns the profile information of the currently authenticated user based on the access token.

Notes:
- Requires a valid access_token cookie
- Token is verified and user is retrieved by ID
- Returns minimal user profile (id, name, email, role)
    `,
    responses: {
      200: {
        description: "User authenticated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
              message: z.string().openapi({ example: "User fetched successfully" }),
              data: z.object({
                user: z.object({
                  id: z.string().openapi({ example: "clx012abc0001xslw4xx9zy90" }),
                  name: z.string().openapi({ example: "John Doe" }),
                  email: z.string().openapi({ example: "john@example.com" }),
                  role: z.string().openapi({ example: "ADMIN" }),
                }),
              }),
            }),
          },
        },
      },
      401: authFnResult,
      404: {
        description: "Access token valid but no matching user in the database",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "Account not found." }),
            }),
          },
        },
      },
      500: commonInternalError("Failed to fetch user data"),
    },
  });
}
