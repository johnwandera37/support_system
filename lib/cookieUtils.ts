import { NextResponse } from "next/server";
import { serialize, type SerializeOptions } from "cookie";
import { logWarn } from "./server/logger";

export function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...v] = cookie.trim().split("=");
      return [key, decodeURIComponent(v.join("="))];
    })
  );
}

type RefreshTokenResult = 
  | { success: true; refreshToken: string }
  | { success: false; response: NextResponse };

export function getRefreshTokenFromRequest(req: Request, route: string): RefreshTokenResult {
  const cookieHeader = req.headers.get("cookie");
  const message = "You need to be logged in to continue.";
  
  // No cookie header at all
  if (!cookieHeader) {
     logWarn({
        route,
        status: 401,
        message: "Missing authentication cookies",
      });
    return {
      success: false,
      response: NextResponse.json(
        { error: message },
        { status: 401 }
      )
    };
  } 

  const cookies = parseCookies(cookieHeader);
  const refreshToken = cookies["refresh_token"];
  
  // Cookie header exists but no refresh token
  if (!refreshToken) {
    const message = "Your session has expired. Please log in again.";
    logWarn({
        route,
        status: 401,
        message: "Missing refresh token",
      });
    return {
      success: false,
      response: NextResponse.json(
        { error: message },
        { status: 401 }
      )
    };
  }
  
  return { success: true, refreshToken };
}


/**
 * Builds a serialized Set-Cookie string for auth tokens (access/refresh/etc.)
 * with the project's standard security defaults.
 */
interface AuthCookieOptions {
  maxAge: number;
  overrides?: Partial<SerializeOptions>; // escape hatch for one-off tweaks
}

export function createAuthCookie(
  name: string,
  value: string,
  { maxAge, overrides }: AuthCookieOptions
): string {
  return serialize(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge,
    ...overrides, // is optional and only there in case some future cookie needs a different sameSite/path/et
  });
}