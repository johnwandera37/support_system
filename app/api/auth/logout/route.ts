import { apiResponse, getRefreshTokenFromRequest } from "@/lib/cookieUtils";
import { verifyRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { errLog } from "@/utils/logger";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Get cookies from header string
  const result = getRefreshTokenFromRequest(req);
  if (!result.success) return result.response;

  try {
    const payload = verifyRefreshToken(result.refreshToken) as {
      sessionId: string;
    };

    //delete the refresh token that is in redis
    const redis = await getRedisClient();
    if (!redis) {
      errLog("Redis client not available");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Delete the refresh token from Redis
    try {
      await redis.del(`session:${payload.sessionId}`);
    } catch (redisErr) {
      errLog("Failed to delete session from Redis", redisErr);
      // Continue with logout even if Redis fails, but log the error
    }

    // Return the response and clear cookies
    return apiResponse({
      status: 200,
      message: "Logout successful.",
      cookiesToClear: ["access_token", "refresh_token"],
    });
  } catch (err) {
    errLog("Error in logout", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
