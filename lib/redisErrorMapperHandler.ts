
import { RedisError } from "@/lib/redis"; // export your custom RedisError
import { getErrorMessage } from "@/utils/errMsg";
import { nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";

// Transient/connectivity issues — expected to self-resolve, logged as warnings.
const TRANSIENT_REDIS_CODES = new Set([
  "REDIS_CONNECTION_REFUSED",
  "REDIS_HOST_NOT_FOUND",
  "REDIS_CONNECTION_RESET",
  "REDIS_CONNECTION_TIMEOUT",
  "REDIS_HOST_UNREACHABLE",
  "REDIS_CONNECTION_FAILED",
]);

// Real ops problems — worth a proper error log + Sentry, not just a warning.
const HARD_FAILURE_REDIS_CODES = new Set(["REDIS_AUTH_FAILED", "REDIS_CONFIG_INCOMPLETE"]);


export function handleRedisError(
  err: unknown,
  route: string = "",
  fallback: { status: number; message: string } = {
    status: 500,
    message: "Internal server error",
  }
) {
  const error = err instanceof Error ? err : new Error(String(err));
  const code = error instanceof RedisError ? error.code : undefined;

  if (code && HARD_FAILURE_REDIS_CODES.has(code)) {
    return nextErrorResponse(error, 500, {
      route,
      message:
        code === "REDIS_CONFIG_INCOMPLETE"
          ? "Server misconfiguration. Contact support."
          : "Internal server error",
    });
  }


  if (code && TRANSIENT_REDIS_CODES.has(code)) {
    return nextWarnResponse(
      "Temporary service unavailable. Please try again shortly.",
      503,
      { route, detail: `Redis transient failure (${code}): ${getErrorMessage(error)}` }
    );
  }

  // Not a RedisError at all, or an unrecognized code — don't shrug this off
  // as transient; treat it as a genuine unexpected failure.
  return nextErrorResponse(error, fallback.status, {
    route,
    message: fallback.message,
  });

}
