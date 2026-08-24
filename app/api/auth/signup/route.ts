import prisma from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { signupSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse, nextInfoResponse, nextWarnResponse } from "@/utils/responseUtils";
import { endpoints } from "@/config/constants";

const ROUTE = endpoints.register;

//This creates user accounts, by default it has the role USER, unless flag wants to be agent is specified which will need approval from admin
export async function POST(req: Request) {
  try {
    //Check if there is an admin whose credentials are updated
    const defaultAdminExists = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        email: "admin@example.com",
      },
    });

    // Block signups if default admin isn't yet updated
    if (defaultAdminExists) {
      return nextWarnResponse(
        "Signup is disabled until the admin account is updated.",
        403,
        { route: ROUTE, detail: "Default admin credentials not yet updated" }
      );
    }

    const body = await req.json();

    const parse = signupSchema.safeParse(body);
    if (!parse.success) {
      return badRequestFromZod(parse.error, 400, { route: ROUTE });
    }

    const { name, email, password, wantsToBeAgent = false } = parse.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return nextWarnResponse("Email already in use", 409, {
        route: ROUTE,
        detail: "Signup rejected — duplicate email",
        meta: { email },
      });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        wantsToBeAgent, // defaults to false if not provided
        role: "USER", // enforced regardless of user input
      },
    });
    return nextInfoResponse("User registered successfully", 200, { route: ROUTE, detail: "New user created", meta: { userId: user.id } })
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Signup failed with unhandled exception" })
  }
}
