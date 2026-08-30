import { authFnResult, forbidden403OnlyAuthFnResult, registry, commonInternalError } from "../reusableObjects";
import { userSummarySchema } from "@/lib/zodSchema";
import { z } from "zod/v4";

export function registerGetAdmins() {
  registry.registerPath({
    method: "get",
    path: "/api/admins/",
    tags: ["Admins"],
    summary: "Get list of available admins",
    description: `
    Retrieves all admin users, for use in the ticket-escalation dropdown
    (an agent/admin must select a target admin before escalating a ticket).

    Notes:
    - Requires ADMIN or AGENT role
    - Token must be provided in the Authorization header as 'Bearer <token>'
    `,
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "List of admins",
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.string().openapi({ example: "cms3oyml60000th3m2i9cd23d" }),
                name: z.string().openapi({ example: "John Doe" }),
                email: z.string().email().openapi({ example: "johndoe@gmail.com" }),
                adminProfile: z.object({ level: z.number().nullable() }).nullable(),
              })
            ),
            examples: {
              admins: {
                value: [
                  {
                    id: "cms3oyml60000th3m2i9cd23d",
                    name: "John Doe",
                    email: "johndoe@gmail.com",
                    adminProfile: { level: 1 },
                  },
                ],
              },
            },
          },
        },
      },
      401: authFnResult,
      403: forbidden403OnlyAuthFnResult,
      500: commonInternalError("Failed to fetch admins"),
    },
  });
}