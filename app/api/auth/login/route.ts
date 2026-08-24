import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePasswords } from "@/lib/hash";
import { signToken, signRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { randomUUID } from "crypto"; //for multiple sessions
import {
  ACCESS_TOKEN_MAX_AGE,
  endpoints,
  REFRESH_TOKEN_MAX_AGE,
} from "@/config/constants";
import { loginSchema } from "@/lib/zodSchema";
import { badRequestFromZod, nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";
import { handleRedisError } from "@/lib/redisErrorMapperHandler";
import { logInfo } from "@/lib/server/logger";
import { createAuthCookie } from "@/lib/cookieUtils";

const ROUTE = endpoints.login;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parse = loginSchema.safeParse(body);
    if (!parse.success) {
      return badRequestFromZod(parse.error, 400, { route: ROUTE });
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return nextWarnResponse(
        "Invalid credentials",
        401,
        { route: ROUTE, detail: "Incorrect email used", meta: { email } }
      );
    }

    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) {
      return nextWarnResponse(
        "Invalid credentials",
        401,
        { route: ROUTE, detail: "Incorrect password", meta: { password } }
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
      return handleRedisError(redisError, ROUTE, {
        status: 503,
        message: "Unable to create session. Please try again later.",
      });
    }

    //Set cookies
    const accessCookie = createAuthCookie("access_token", accessToken, {
      maxAge: ACCESS_TOKEN_MAX_AGE, // 15 minutes
    });

    const refreshCookie = createAuthCookie("refresh_token", refreshToken, {
      maxAge: REFRESH_TOKEN_MAX_AGE, // 7 days
    });

    logInfo({
      route: ROUTE,
      status: 200,
      message: "Login successful",
      meta: { userId: user.id },
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
      return nextErrorResponse(error, 500, { route: ROUTE, message: "Internal Server Error" })
  }
}
