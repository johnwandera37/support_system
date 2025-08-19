import { NextResponse } from "next/server";
// import { RedisError } from "@/lib/redis"; // export your custom RedisError
import { getErrorMessage } from "@/utils/errMsg";
import { errLog } from "@/utils/logger";

export function handleRedisError(
  err: unknown,
  context: string = "",
  fallback: { status: number; message: string } = {
    status: 500,
    message: "Internal server error",
  }
): NextResponse {
  const error = err instanceof Error ? err : new Error(String(err));
  const code = (error as any).code;
  const msg = getErrorMessage(error);

  errLog(`❌ Redis error in ${context}:`, `Code=${code}`, `Message=${msg}`);

  switch (code) {
    case "REDIS_AUTH_FAILED":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );

    case "REDIS_CONNECTION_REFUSED":
    case "REDIS_HOST_NOT_FOUND":
    case "REDIS_CONNECTION_RESET":
    case "REDIS_CONNECTION_TIMEOUT":
    case "REDIS_HOST_UNREACHABLE":
    case "REDIS_CONNECTION_FAILED":
      return NextResponse.json(
        { error: "Temporary service unavailable. Please check your connection and try again." },
        { status: 503 }
      );

    case "REDIS_CONFIG_INCOMPLETE":
      return NextResponse.json(
        { error: "Server misconfiguration. Contact support." },
        { status: 500 }
      );

    default:
      return NextResponse.json(
      { error: fallback.message },
        { status: fallback.status }
      );
  }
}
