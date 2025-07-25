// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import { getUserById } from "@/utils/getUserById";
import { errLog } from "@/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyAccessToken(accessToken) as {
      id: string;
      role: string;
    };
    const user = await getUserById(payload.id);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    errLog("An error occured in me route: fetching user data");
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
