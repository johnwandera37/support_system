import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";
import { nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextResponse } from "next/server";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export function signToken(payload: object) { 
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] });
}

type TokenVerificationResult<T> =
  | { success: true; payload: T }
  | { success: false; response: NextResponse };

function verifyToken<T = JwtPayload>(
  token: string,
  secret: string,
  route: string,
  tokenLabel: string
): TokenVerificationResult<T> {
  try {
    const payload = jwt.verify(token, secret) as T;
    return { success: true, payload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        response: nextWarnResponse("Session expired. Please log in again.", 401, {
          route,
          detail: `${tokenLabel} expired: ${getErrorMessage(err)}`,
        }),
      };
    }

    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError) {
      return {
        success: false,
        response: nextWarnResponse("Invalid session. Please log in again.", 401, {
          route,
          detail: `${tokenLabel} invalid: ${getErrorMessage(err)}`,
        }),
      };
    }

    // Unexpected error — not a "normal" jwt rejection, treat as a real failure
    return {
      success: false,
      response: nextErrorResponse(err, 500, {
        route,
        message: `${tokenLabel} verification failed unexpectedly`,
      }),
    };
  }
}

export function verifyAccessToken<T = JwtPayload>(token: string, route: string): TokenVerificationResult<T> {
  return verifyToken<T>(token, ACCESS_SECRET, route, "Access token");
}

export function verifyRefreshToken<T = JwtPayload>(token: string, route: string): TokenVerificationResult<T> {
  return verifyToken<T>(token, REFRESH_SECRET, route, "Refresh token");
}