import { NextResponse } from "next/server";
import { signToken, verifyRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { serialize } from "cookie";
import { errLog, log } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { ACCESS_TOKEN_MAX_AGE } from "@/config/constants";
import { getRefreshTokenFromRequest } from "@/lib/cookieUtils";

export async function POST(req: Request) {
  // Get cookies from header string
  const result = getRefreshTokenFromRequest(req);
  if (!result.success) return result.response;

  try {
    // Validate refresh token via JWT
    const payload = verifyRefreshToken(result.refreshToken) as {
      id: string;
      role: string;
      sessionId: string;
    };

    // Look refresh token in Redis with session key (multiple device login functionality)
    const redis = await getRedisClient();
    const redisKey = `session:${payload.sessionId}`;
    const storedRefreshToken = await redis.get(redisKey);
    if (!storedRefreshToken || storedRefreshToken !== result.refreshToken) {
      return NextResponse.json({ error: "Session expired" }, { status: 403 });
    }

    //Create new access token if a match if found in redis
    const newAccessToken = signToken({ id: payload.id, role: payload.role });

    const accessCookie = serialize("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE, // 15 mins
      sameSite: "lax",
    });

    const res = new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

    res.headers.append("Set-Cookie", accessCookie);
    return res;
  } catch (error) {
    errLog("Refresh token error:", getErrorMessage(error));
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
