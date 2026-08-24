import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

export const log = (...args: any[]) => {
  if (isDev) {
    console.log("[LOG]", ...args);
  }
};

export const warnLog = (...args: any[]) => {
  if (isDev) {
    console.warn("[WARN]", ...args);
  }
};

export const errLog = (...args: any[]) => {
  if (isDev) {
    console.error("[ERROR]", ...args);
    return;
  }

  /// In prod, no console spam — report to Sentry instead
  const err = args.find((a) => a instanceof Error);
  Sentry.captureException(err ?? new Error(args.map(String).join(" ")));
};
