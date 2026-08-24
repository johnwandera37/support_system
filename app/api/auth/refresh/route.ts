import { NextResponse } from "next/server";
import { signToken, verifyRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { ACCESS_TOKEN_MAX_AGE, endpoints } from "@/config/constants";
import { createAuthCookie, getRefreshTokenFromRequest } from "@/lib/cookieUtils";
import { handleRedisError } from "@/lib/redisErrorMapperHandler";
import { nextWarnResponse } from "@/utils/responseUtils";
import { logInfo } from "@/lib/server/logger";

const ROUTE = endpoints.refresh

export async function POST(req: Request) {
  // Get cookies from header string
  const cookieResult = getRefreshTokenFromRequest(req, ROUTE);
  if (!cookieResult.success) return cookieResult.response;

  // Validate refresh token via JWT
  const verifyResult = verifyRefreshToken<{
    id: string;
    role: string;
    sessionId: string;
  }>(cookieResult.refreshToken, ROUTE);
  if (!verifyResult.success) return verifyResult.response;

  const { payload } = verifyResult;

  try {
    // Attempt to get Redis client
    const redis = await getRedisClient();
    const redisKey = `session:${payload.sessionId}`;
    const storedRefreshToken = await redis.get(redisKey);

    if (!storedRefreshToken || storedRefreshToken !== cookieResult.refreshToken) {
      return nextWarnResponse("Session expired. Please log in again.", 403, {
        route: ROUTE,
        detail: "Refresh token not found in Redis or mismatched stored value",
        meta: { sessionId: payload.sessionId },
      });
    }

    // Create new access token
    const newAccessToken = signToken({ id: payload.id, role: payload.role });
    const accessCookie = createAuthCookie("access_token", newAccessToken, {
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    logInfo({
      route: ROUTE,
      status: 200,
      message: "Access token refreshed",
      meta: { userId: payload.id },
    });

    const res = new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": accessCookie,
      },
    });

    return res;
  } catch (redisError: unknown) {
    return handleRedisError(redisError, ROUTE, {
      status: 401,
      message: "Session validation failed",
    });
  }
}
