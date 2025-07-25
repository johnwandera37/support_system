import { verifyAccessToken } from "@/lib/jwt";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog } from "@/utils/logger";
import { NextResponse } from "next/server";

// Verify the jwt and authorize roles

export function authorize(roles: string[] = []) {
  return async function middleware(req: Request) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = verifyAccessToken(token) as { id: string; role: string };

      if (roles.length && !roles.includes(decoded.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // return the user data 
      return { authorized: true, user: decoded };
    } catch (err) {
        errLog("Auth error", getErrorMessage(err));
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  };
} 
