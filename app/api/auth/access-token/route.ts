import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

    try {
       /**
     * 🔍 SECURITY NOTE:
     * We are intentionally using jwt.decode() here without signature verification.
     * This endpoint is NOT making authentication/authorization decisions — it is
     * only reporting token metadata (expiry time) to the frontend.
     * Token validity is enforced in login/refresh handlers where jwt.verify() is used.
     */
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded?.exp) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - currentTime;

    return NextResponse.json({ token, expiresIn });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
}
