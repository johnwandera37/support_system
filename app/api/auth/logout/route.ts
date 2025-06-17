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
    await redis.del(`session:${payload.sessionId}`);

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
