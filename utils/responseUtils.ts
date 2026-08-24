import { logError, logInfo, LogMeta, logWarn } from "@/lib/server/logger";
import { NextResponse } from "next/server";
import { treeifyError, ZodError } from "zod/v4";
import { extractFieldErrorMessagesFromTree, extractFieldErrorsFromTree, joinErrorMessages } from "./extractFieldErrors";
import { getErrorMessage } from "./errMsg";
import { serialize } from "cookie";

// bad request from zod
export function badRequestFromZod(error: ZodError, statusVal: number = 400, logMeta?: Omit<LogMeta, "message" | "status" | "error">) {
  const tree = treeifyError(error);
  const fieldErrors = extractFieldErrorsFromTree(tree);
  const messages = extractFieldErrorMessagesFromTree(tree);
  const logMessages = joinErrorMessages(messages)

    logWarn({
          route: logMeta!.route,
          status: statusVal,
          message: "Check input format",
          error: logMessages
        });
  return NextResponse.json({ error: fieldErrors, message: messages }, { status: statusVal });
}

// Common next error response, used in try catch error block
export function nextErrorResponse(error: unknown, statusVal: number, logMeta?: Omit<LogMeta, | "status" | "error">  ) {
  const errMessage = getErrorMessage(error) // Real error message goes to logs and sentry
  const message = logMeta?.message ?? "Internal Server Error"; // friendly error message that can be displayed from frontend
   logError(
        {
          route: logMeta!.route,
          status: statusVal ?? 500,
          message: message,
          error: errMessage,
          meta: logMeta?.meta
        },
        error
      );
  
  return NextResponse.json({ error: message }, { status: statusVal });
}

// Common warn response, used for expected/business-logic failures (403, 409, validation-adjacent, etc.)
export function nextWarnResponse(
  message: string, // friendly message shown to the fronten
  statusVal: number,
  logMeta?: Omit<LogMeta, "message" | "status" | "error"> // detail = internal log-only reason
  )
 {
  logWarn({
    route: logMeta?.route ?? "",
    status: statusVal,
    message,
    detail: logMeta?.detail,
    meta: logMeta?.meta,
  });

  return NextResponse.json({ error: message }, { status: statusVal });
}

// Common info response, used for successful operations that should be logged
export function nextInfoResponse<T = undefined>(
  message: string,
  statusVal: number = 200,
  logMeta?: Omit<LogMeta, "message" | "status" | "error">,
  data?: T
) {
  logInfo({
    route: logMeta?.route ?? "",
    status: statusVal,
    message,
    detail: logMeta?.detail,
    meta: logMeta?.meta,
  });

  return NextResponse.json(
    { message, ...(data !== undefined ? { data } : {}) },
    { status: statusVal }
  );
}


// Use the following in logout route, helps to keep it clean
interface ApiResponseOptions<T = unknown> {
  status?: number;
  success?: boolean;
  message?: string;
  data?: T;
  cookiesToClear?: string[];
  route?: string;              // if provided, this response gets logged
  detail?: string;             // optional internal-only context for the log
  logMeta?: Record<string, unknown>; // extra log meta, e.g. { userId }
}

export function apiResponse<T>(options: ApiResponseOptions<T> = {}) {
  const {
    status = 200,
    success = true,
    message = '',
    data,
    cookiesToClear = [], // Here, you can pass default tokens to be cleared but leave it empty to simply clear speciied ones
    route,
    detail,
    logMeta,
  } = options;

  // Logs info or Warn
  if (route) {
    const logFn = success ? logInfo : logWarn;
    logFn({
      route,
      status,
      message: message || (success ? "Request succeeded" : "Request failed"),
      detail,
      meta: logMeta,
    });
  }

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