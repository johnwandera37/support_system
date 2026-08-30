import z, { success } from "zod/v4";
import { commonInternalError, registry } from "../reusableObjects";
import { loginSchema, zodTreeifiedErrorSchema } from "@/lib/zodSchema";

export function regigisterLogin() {
  registry.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Authentication"],
    summary: "Authenticate user and get access tokens",
    description: `
    Authenticates a user and returns JWT tokens via cookies and user information in the response body.
    
    Notes:
    - Sets HTTP-only cookies for access_token (15min expiry) and refresh_token (7 days expiry)
    - Uses Redis to store refresh tokens with session management
    - Returns basic user information in the response
    - Invalid credentials return generic "Invalid credentials" message
  `,
    request: {
      body: {
        content: {
          "application/json": {
            schema: loginSchema,
            examples: {
              adminLogin: {
                summary: "Admin login",
                value: {
                  email: "admin@example.com",
                  password: "adminPassword123",
                },
              },
              agentLogin: {
                summary: "Aent user login",
                value: {
                  email: "agent@example.com",
                  password: "agentPassword123",
                },
              },
              userLogin: {
                summary: "Regular user login",
                value: {
                  email: "user@example.com",
                  password: "userPassword123",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Login successful",
        headers: {
          "Set-Cookie": {
            schema: {
              type: "string",
              example:
                "access_token=abc123; Path=/; HttpOnly; Max-Age=900, refresh_token=def456; Path=/; HttpOnly; Max-Age=604800",
            },
          },
        },
        content: {
          "application/json": {
            schema: z.object({
              message: z.string().openapi({
                example: "Login successful",
              }),
              user: z.object({
                id: z.string().openapi({
                  example: "clxyz1234567890abcdefgh",
                }),
                name: z.string().openapi({
                  example: "John Doe",
                }),
                email: z.string().email().openapi({
                  example: "user@example.com",
                }),
                role: z.string().openapi({
                  example: "USER",
                }),
              }),
            }),
            examples: {
              successResponse: {
                value: {
                  success: true,
                  message: "Login successful",
                  user: {
                    id: "clxyz1234567890abcdefgh",
                    name: "John Doe",
                    email: "user@example.com",
                    role: "USER",
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: zodTreeifiedErrorSchema.openapi({
              example: {
                error: {
                  errors: [],
                  properties: {
                    email: {
                      errors: ["Invalid email address"],
                    },
                  },
                },
              },
            }),
          },
        },
      },
      401: {
        description: "Authentication failed",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Invalid credentials",
              }),
            }),
            examples: {
              invalidEmail: {
                summary: "Invalid email provided",
                description: "Invalid email provided",
                value: {
                  error: "Invalid credentials",
                },
              },
              invalidPassword: {
                summary: "Invalid password provided",
                description: "Invalid password provided",
                value: {
                  error: "Invalid credentials",
                },
              },
            },
          },
        },
      },
      500: commonInternalError("Internal Server Error"),
    },
  });
}
