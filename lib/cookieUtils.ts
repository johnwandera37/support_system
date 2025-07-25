import { NextResponse } from "next/server";
import { serialize } from "cookie";

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

export function getRefreshTokenFromRequest(req: Request): RefreshTokenResult {
  const cookieHeader = req.headers.get("cookie");
  
  // No cookie header at all
  if (!cookieHeader) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Missing authentication cookies" },
        { status: 401 }
      )
    };
  } 

  const cookies = parseCookies(cookieHeader);
  const refreshToken = cookies["refresh_token"];
  
  // Cookie header exists but no refresh token
  if (!refreshToken) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Missing refresh token" },
        { status: 401 }
      )
    };
  }
  
  return { success: true, refreshToken };
}



interface ApiResponseOptions<T = any> {
  status?: number;
  success?: boolean;
  message?: string;
  data?: T;
  cookiesToClear?: string[];
}

export function apiResponse<T>(options: ApiResponseOptions<T> = {}) {
  const {
    status = 200,
    success = true,
    message = '',
    data,
    cookiesToClear = [] // Here, you can pass default tokens to be cleared but leave it empty to simply clear speciied ones
  } = options;

  const response = NextResponse.json({
    success,
    message,
    ...(data && { data }) // Only include data if provided
  }, { status });

  // Clear specified cookies
  cookiesToClear.forEach((token) => {
    response.headers.append(
      "Set-Cookie",
      serialize(token, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      })
    );
  });

  return response;
}