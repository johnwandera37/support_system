import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth"; // helper to extract user from token
import { comparePasswords, hashPassword } from "@/lib/hash"; // assuming you have a hash utility
import { getErrorMessage } from "@/utils/errMsg";
import { updateProfileSchema } from "@/lib/zodSchema";
import { apiResponse, badRequestFromZod, nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";
import { getRedisClient } from "@/lib/redis";
import { getRefreshTokenFromRequest } from "@/lib/cookieUtils";
import { verifyRefreshToken } from "@/lib/jwt";
import { endpoints } from "@/config/constants";
import { logWarn } from "@/lib/server/logger";

const ROUTE = endpoints.updateProfile

export async function PATCH(req: Request) {
  try {
    const userOrResponse = await getUserFromToken(req, ROUTE); // Extract user info from JWT / response

    // Check if it's a NextResponse (error case)
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse; // Return the error response directly
    }

    // Now we know it's the user object
    const user = userOrResponse;

    // 1. Verify admin privileges
    if (!user || user.role !== "ADMIN") {
      return nextWarnResponse("Unauthorized, Admin access required", 403, { route: ROUTE });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body); //this checks if body is correct with zod schemas

    // 422 - Validation Errors
    if (!parsed.success) {
      return badRequestFromZod(parsed.error, 422, { route: ROUTE });
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
      return nextWarnResponse(
        "Default Admin account not found, either it was updated or not seeded initially",
        404,
        { route: ROUTE }
      );
    }

    // 3. Ensure admin proceeds with their unique email, not the default one  // 403 - Security Policy Violations
    if (email === dbAdmin.email && dbAdmin.email === "admin@example.com") {
      return nextWarnResponse("Must change default admin email", 403, { route: ROUTE });
    }

    // 4. Verify current password against seeded credentials
    const passwordValid = await comparePasswords(
      currentPassword,
      dbAdmin.password
    );

    // 401 - Credential Verification
    if (!passwordValid) {
      return nextWarnResponse("Current password incorrect, use the initially seeded credentials", 401, {
        route: ROUTE,
      });
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
        return nextWarnResponse("Email already in use by another account", 409, {
          route: ROUTE,
          meta: { email },
        });
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

    // Session cleanup is best-effort from here — the credential update above
    // already succeeded, so nothing in this block should cause the response
    // to look like a failure.
    let sessionCleared = true;

    try {
      // 7. Clear redis session for the default admin
      const cookieResult = getRefreshTokenFromRequest(req, ROUTE);
      if (!cookieResult.success) throw new Error("Missing refresh token during session cleanup");
      //return cookieResult.response; we are not returning response, instead we are throwing

      const verifyResult = verifyRefreshToken<{ sessionId: string }>(cookieResult.refreshToken, ROUTE);
      if (!verifyResult.success) throw new Error("Invalid refresh token during session cleanup");
      // return verifyResult.response; instead throw error

      const { sessionId } = verifyResult.payload;

      //delete the refresh token that is in redis
      const redis = await getRedisClient();
      await redis.del(`session:${sessionId}`);

    } catch (cleanupError) {
      sessionCleared = false;
      logWarn({
        route: ROUTE,
        status: 200,
        message: "Admin credentials updated but session cleanup failed",
        detail: getErrorMessage(cleanupError),
      });
    }

    // 8. Return the response
    return apiResponse({
      status: 200,
      message: sessionCleared
        ? "Credentials updated. Please login again."
        : "Credentials updated. Some sessions may remain active.",
      data: {
        requiresReauth: true,
      },
      cookiesToClear: ["access_token", "refresh_token"],
      route: ROUTE,
      logMeta: { userId: user.id, sessionCleared },
    });

    // 9. Force client-side reauthentication
    // Then from the front end redirect them to login page, 
    // you can use middleware that runs on edge cases, responsible for redirections and route protection or proxy depends will see this during implementation
  } catch (err) {
    return nextErrorResponse(err, 500, { route: ROUTE, message: "Credential update failed" });
  }
}
