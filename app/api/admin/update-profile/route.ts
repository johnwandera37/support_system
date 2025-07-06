import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth"; // helper to extract user from token
import { comparePasswords, hashPassword } from "@/lib/hash"; // assuming you have a hash utility
import { errLog, log } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { updateProfileSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/responseUtils";
import { getRedisClient } from "@/lib/redis";
import { apiResponse, getRefreshTokenFromRequest } from "@/lib/cookieUtils";
import { verifyRefreshToken } from "@/lib/jwt";

export async function PATCH(req: Request) {
  try {
    const userOrResponse = await getUserFromToken(req); // Extract user info from JWT / response

    // Check if it's a NextResponse (error case)
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse; // Return the error response directly
    }

    // Now we know it's the user object
    const user = userOrResponse;

    // 1. Verify admin privileges
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized, Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body); //this checks if body is correct with zod schemas

    // 422 - Validation Errors
    if (!parsed.success) {
      return badRequestFromZod(parsed.error, 422);
    }

    // Now we have received data from the body
    const { name, email, password, currentPassword } = parsed.data;

    // 2. Get default admin(This will proceed with the current admin trying to do this operation)
    const dbAdmin = await prisma.user.findUnique({
      where: { id: user.id },
    });

    //Check admin with default credential, if not found, either admin was not seeded or was updated
    const defaultAdminExists = dbAdmin?.email === "admin@example.com";
    if (!defaultAdminExists) {
      return NextResponse.json(
        {
          error:
            "Default Admin account not found, either it was updated or not seeded initially",
        },
        { status: 404 }
      );
    }

    // 3. Ensure admin proceeds with their unique email, not the default one  // 403 - Security Policy Violations
    if (email === dbAdmin.email && dbAdmin.email === "admin@example.com") {
      return NextResponse.json(
        { error: "Must change default admin email" },
        { status: 403 }
      );
    }

    // 4. Verify current password against seeded credentials
    const passwordValid = await comparePasswords(
      currentPassword,
      dbAdmin.password
    );

    // 401 - Credential Verification
    if (!passwordValid) {
      return NextResponse.json(
        {
          error:
            "Current password incorrect, Use the initially seeded credentials",
        },
        { status: 401 }
      );
    }

    // 5. Email uniqueness check (excluding self)
    if (email !== dbAdmin.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: dbAdmin.id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use by another account" },
          { status: 409 }
        );
      }
    }

    // 6. Update admin credentials
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    try {
      // 7. Clear redis session for the default admin
      const result = getRefreshTokenFromRequest(req);
      if (!result.success) return result.response;

      const payload = verifyRefreshToken(result.refreshToken) as {
        sessionId: string;
      };
      //delete the refresh token that is in redis
      const redis = await getRedisClient();
      await redis.del(`session:${payload.sessionId}`);

      // 8. Return the response
      return apiResponse({
        status: 200,
        message: "Credentials updated. Please login again.",
        data: {
          requiresReauth: true,
        },
        cookiesToClear: ["access_token", "refresh_token"],
      });
    } catch (error) {
      errLog("Cleanup error | Redis: ", getErrorMessage(error))
        // Still proceed with credential update but warn about active sessions
      return apiResponse({
        status: 200,
        message: "Credentials updated. Some sessions may remain active.",
        data: { requiresReauth: true },
        cookiesToClear: ["access_token", "refresh_token"],
      });
    }

    // 9. Force client-side reauthentication
    // Then from the front end redirect them to login again
  } catch (err) {
    errLog("Admin credential update failed:", getErrorMessage(err));
    return NextResponse.json(
      { error: "Credential update failed" },
      { status: 500 }
    );
  }
}
