import z from "zod/v4";
import { registry, serverErr1 } from "../reusableObjects";
import { signupSchema } from "@/lib/zodSchema";
import { zodTreeifiedErrorSchema } from "@/utils/zodErrSchema";

export function regigisterSignup() {
  registry.registerPath({
    method: "post",
    path: "/api/auth/signup",
    tags: ["Authentication"],
    summary: "Register a new user account",
    description: `
    Creates a new user account with default USER role.
    
    Notes:
    - Signups are disabled if default admin credentials haven't been updated
    - Password will be hashed before storage
    - By default creates regular users (role=USER)
    - Can request agent status (requires admin approval)
  `,
    request: {
      body: {
        content: {
          "application/json": {
            schema: signupSchema,
            examples: {
              regularUser: {
                summary: "Regular user signup",
                value: {
                  name: "John Doe",
                  email: "user@example.com",
                  password: "securePassword123",
                },
              },
              agentApplicant: {
                summary: "Agent applicant signup",
                value: {
                  name: "Jane Smith",
                  email: "jane@example.com",
                  password: "agentPassword123",
                  wantsToBeAgent: true,
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "User registered successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string().openapi({
                example: "User registered successfully",
              }),
            }),
          },
        },
      },
      // 400: {
      //   description: "Validation error",
      //   content: {
      //     "application/json": {
      //       schema: z.object({
      //         error: z.object({
      //           errors: z.array(z.string()).optional(),
      //           properties: z
      //             .record(
      //               z.string(),
      //               z.object({
      //                 errors: z.array(z.string()),
      //               })
      //             )
      //             .optional()
      //             .openapi({
      //               example: {
      //                 name: {
      //                   errors: ["String must contain at least 2 character(s)"],
      //                 },
      //                 email: {
      //                   errors: ["Invalid email"],
      //                 },
      //                 password: {
      //                   errors: [
      //                     "Password must be at least 8 characters",
      //                     "Must contain at least one uppercase letter",
      //                     "Must contain at least one lowercase letter",
      //                     "Must contain at least one number",
      //                   ],
      //                 },
      //                 wantsToBeAgent: {
      //                   errors: ["Expected boolean, received string"],
      //                 },
      //               },
      //               description: "Field-specific validation errors",
      //             }),
      //         }),
      //       }),
      //     },
      //   },
      // },

      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: zodTreeifiedErrorSchema.openapi({
              example: {
                error: {
                  errors: [],
                  properties: {
                    name: {
                      errors: ["String must contain at least 2 character(s)"],
                    },
                    email: {
                      errors: ["Invalid email"],
                    },
                    password: [
                      "Password must be at least 8 characters",
                      "Must contain at least one uppercase letter",
                      "Must contain at least one lowercase letter",
                      "Must contain at least one number",
                    ].map((msg) => ({ errors: [msg] }))[0], // simplified for copy-paste
                    wantsToBeAgent: {
                      errors: ["Expected boolean, received string"],
                    },
                  },
                },
              },
            }),
          },
        },
      },

      403: {
        description: "Signup disabled",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example:
                  "Signup is disabled until the admin account is updated.",
              }),
            }),
          },
        },
      },
      409: {
        description: "Email conflict",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({
                example: "Email already in use",
              }),
            }),
          },
        },
      },
      500: serverErr1,
    },
  });
}
