import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { signupSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/responseUtils";

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
      return NextResponse.json(
        {
          error: "Signup is disabled until the admin account is updated.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const parse = signupSchema.safeParse(body);
    if (!parse.success) {
     return badRequestFromZod(parse.error);
    }

    const { name, email, password, wantsToBeAgent = false } = parse.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        wantsToBeAgent, // defaults to false if not provided
        role: "USER", // enforced regardless of user input
      },
    });

    return NextResponse.json({ message: "User registered successfully" }, {status: 200});
  } catch (error) {
    errLog("Signup error", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
