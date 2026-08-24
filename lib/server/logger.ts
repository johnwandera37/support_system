import fs from "fs";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import * as Sentry from "@sentry/nextjs";

//Advance logging with winston(fs is used, should only be used on server side with routes, otherwise fs will cause errors)

export interface LogMeta {
  route: string;              // e.g. "/api/auth/signup"
  status?: number;            // HTTP status you're returning
  message: string;            // human-readable summary
  detail?: string;            // extra internal-only context
  error?: string;             // getErrorMessage(err) output, only for warn/error
  stack?: string;             // err.stack — full trace, only when available
  meta?: Record<string, unknown>; // anything extra: userId, email, etc — no passwords/tokens
}

// ✅ Create necessary folders
const folders = ["logs", "logs/errors", "logs/combined"];
folders.forEach((folder) => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
});

const isProd = process.env.NODE_ENV === "production";

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.simple()
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(), // logs to terminal

    // 🔁 Daily rotating error log
    new DailyRotateFile({
      filename: "logs/errors/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "2m", // 🔒 Max size per file
      maxFiles: "14d",  // 🧹 Keep for 14 days
      zippedArchive: true,
    }),

    // 🔁 Daily rotating combined log
    new DailyRotateFile({
      filename: "logs/combined/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: isProd ? "info" : "debug",
      maxSize: "5m", // 🔒 Max size per file
      maxFiles: "14d",    // 🧹 Keep for 14 days
      zippedArchive: true,
    }),
  ],
});


export const logInfo = (payload: LogMeta) => logger.info(payload);
export const logWarn = (payload: LogMeta) => logger.warn(payload);
export const logDebug = (payload: LogMeta) => logger.debug(payload);

// rawError: pass the original caught error (not the stringified one) so
// Sentry gets a real stack trace, not just a message string.
export const logError = (payload: Omit<LogMeta, "stack">, rawError?: unknown) => {
  const stack = rawError instanceof Error ? rawError.stack : undefined;
  logger.error({ ...payload, stack });

  Sentry.captureException(
    rawError instanceof Error ? rawError : new Error(payload.message),
    { extra: { route: payload.route, status: payload.status, ...payload.meta } }
  );
};

export default logger;

// ================ Winston notes ================

// format: winston.format.combine(
//   winston.format.timestamp(),
//   winston.format.json()
// ),

// Erro levels
// error
// warn
// info
// http
// verbose
// debug
// silly

//Usage
// Info → logger.info(...)

// Errors → logger.error(...)

// Warnings → logger.warn(...)

// Debug → logger.debug(...) (optional for dev) but if level specified

// 🟣 External Services: You Mentioned "DB, LogRocket, etc"
// Yes — transports can also send logs to:

// Remote log aggregators:

// 🟦 Logtail

// 📊 Datadog

// 🧪 Sentry

// 🟢 Loggly

// 💾 MongoDB (custom transport)

// Its confusing but will learn as we keep going
// Level	Severity	Captured when level is set to…
// error	0	error, warn, info, http, verbose, debug, silly
// warn	1	warn, info, http, verbose, debug, silly
// info	2	info, http, verbose, debug, silly
// http	3	http, verbose, debug, silly
// verbose	4	verbose, debug, silly
// debug	5	debug, silly
// silly	6	silly only

// ================ Winston notes ================
