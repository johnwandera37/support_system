import { getRefreshTokenFromRequest } from "@/lib/cookieUtils";
import { verifyRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { getErrorMessage } from "@/utils/errMsg";
import { apiResponse, nextErrorResponse } from "@/utils/responseUtils";
import { endpoints } from "@/config/constants";
import { logError } from "@/lib/server/logger";

const ROUTE = endpoints.logout

export async function POST(req: Request) {
  // Get cookies from header string
  const cookieResult = getRefreshTokenFromRequest(req, ROUTE);
  if (!cookieResult.success) return cookieResult.response;

  const verifyResult = verifyRefreshToken<{ sessionId: string }>(cookieResult.refreshToken, ROUTE);
  if (!verifyResult.success) return verifyResult.response;

  const { sessionId } = verifyResult.payload;

  try {
    // Clear Redis session
    try {
      const redis = await getRedisClient();
      //delete the refresh token that is in redis
      await redis.del(`session:${sessionId}`);
    } catch (redisError) {
      // Continue with logout even if Redis fails, but log the error
      logError(
        {
          route: ROUTE,
          status: 503,
          message: "Logout cleanup: failed to delete session from Redis",
          error: getErrorMessage(redisError),
        },
        redisError
      );
    }

    // Return the response and clear cookies and log warn or info
    return apiResponse({
      status: 200,
      message: "Logout successful.",
      cookiesToClear: ["access_token", "refresh_token"],
      route: endpoints.logout,
      detail: "Logout success, access_token, refresh_token cleared"
    });

  } catch (err) {
    return nextErrorResponse(err, 500, {
      route: ROUTE,
      message: "Logout failed with unhandled exception",
    });
  }
}

