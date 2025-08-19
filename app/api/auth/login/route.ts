import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePasswords } from "@/lib/hash";
import { signToken, signRefreshToken } from "@/lib/jwt";
import { serialize } from "cookie"; //serialize data into a cookie header
import { getRedisClient } from "@/lib/redis";
import { randomUUID } from "crypto"; //for multiple sessions
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/config/constants";
import { loginSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/responseUtils";
import { handleRedisError } from "@/lib/redisErrorMapperHandler";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parse = loginSchema.safeParse(body);
    if (!parse.success) {
      return badRequestFromZod(parse.error);
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    //Create access token
    const accessToken = signToken({
      id: user.id,
      role: user.role,
    });

    const sessionId = randomUUID(); // or nanoid()
    //Create refresh token
    const refreshToken = signRefreshToken({
      id: user.id,
      role: user.role,
      sessionId, // 👈 included in JWT payload for multiple session
    });

    // Set refresh token and user id in redis
    try {
      const redis = await getRedisClient();
      await redis.set(`session:${sessionId}`, refreshToken, {
        EX: REFRESH_TOKEN_MAX_AGE,
      }); // 7 days
    } catch (redisError) {
      return handleRedisError(redisError, "login handler", {
        status: 503,
        message: "Unable to create session. Please try again later.",
      });
    }

    //Set cookies
    const accessCookie = serialize("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE, // 15 minutes
      sameSite: "lax",
    });

    const refreshCookie = serialize("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE, // 7 days
      sameSite: "lax",
    });

    const res = new NextResponse(
      JSON.stringify({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.headers.append("Set-Cookie", accessCookie);
    res.headers.append("Set-Cookie", refreshCookie);

    return res;
  } catch (error) {
    const message = getErrorMessage(error);
    errLog("Login Error: ", message);
    return NextResponse.json(
      { error: message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
