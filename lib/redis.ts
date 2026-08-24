import {
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USERNAME,
  REDIS_TLS_ENABLED,
  REDIS_IDLE_DISCONNECT_MS,
  REDIS_RECONNECT_MAX_RETRIES,
  REDIS_RECONNECT_BASE_DELAY_MS,
  REDIS_RECONNECT_MAX_DELAY_MS,
} from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";
import { createClient, RedisClientType } from "redis";
import { logDebug, logError, logInfo, logWarn } from "./server/logger";


// Not a real HTTP route — used as the `route` tag on LogMeta so these
// background/lifecycle events are traceable in logs like everything else.
const SOURCE = "lib/redis";

let client: RedisClientType | null = null;
let idleTimeout: NodeJS.Timeout | null = null;
let manuallyQuit = false;

export class RedisError extends Error {
  code: string;
  constructor(code: string, message?: string, stack?: string) {
    super(message ?? code);
    this.name = "RedisError";
    this.code = code;
    if (stack) this.stack = stack; // wont be using this for now, unless debugging
  }
}

interface ErrorWithCode extends Error {
  code?: string;
}

export async function quitClient() {
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }

  if (client && client.isOpen) {
    manuallyQuit = true; // <-- mark as intentional quit, so reconnectStrategy backs off ✅
    try {
      await client.quit();
      logInfo({ route: SOURCE, message: "Redis client quit intentionally" });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logWarn({
        route: SOURCE,
        message: "Error while quitting Redis",
        detail: error.message,
      });
    } finally {
      client = null;
    }
  }
}

const resetIdleTimer = () => {
  if (idleTimeout) clearTimeout(idleTimeout);

  // 0 (or unset) disables idle-disconnect, 
  // especially in docker unlike in cloud we might want to disconect if unused — the connection stays open until
  // quitClient() is called explicitly (e.g. on process shutdown).
  if (!REDIS_IDLE_DISCONNECT_MS || REDIS_IDLE_DISCONNECT_MS <= 0) return;

  idleTimeout = setTimeout(async () => {
    if (client && client.isOpen) {
      logDebug({ route: SOURCE, message: "Closing idle Redis connection (idle timeout)" });
      await quitClient();
    }
  }, REDIS_IDLE_DISCONNECT_MS); // // Auto-disconnect after "IDLE_DISCONNECT_TIMEOUT" of inactivity, 0 in docker redis
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (client && client.isOpen) {
    resetIdleTimer();
    logDebug({ route: SOURCE, message: "Reusing existing Redis connection" });
    return client;
  }

  if (!REDIS_HOST || !REDIS_PORT) {
    const errorMsg = "Redis configuration is incomplete";
    logError({ route: SOURCE, status: 500, message: errorMsg });
    throw new RedisError("REDIS_CONFIG_INCOMPLETE", errorMsg);
  }

  // Reset here — a fresh client deserves a fresh chance to reconnect.
  // Without this, any client created after a prior quitClient() call would
  // have reconnectStrategy permanently refuse to retry.
  manuallyQuit = false;

  logDebug({
    route: SOURCE,
    message: "Creating new Redis client",
    detail: `tls=${REDIS_TLS_ENABLED}`,
  });

  client = createClient({
    ...(REDIS_PASSWORD
      ? {
        username: REDIS_USERNAME || undefined,
        password: REDIS_PASSWORD,
      }
      : {}),
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      tls: REDIS_TLS_ENABLED || undefined,
      reconnectStrategy: (retries) => {
        // If client was quit, do NOT retry
        if (manuallyQuit) {
          return new Error("Client was quit, not reconnecting");
        }
        if (retries >= REDIS_RECONNECT_MAX_RETRIES) {
          logError({ route: SOURCE, status: 503, message: "Max Redis reconnection attempts reached" });
          return false; // stop reconnecting, could return REDIS_CONNECTION_FAILED but false is fine
        }
        logWarn({
          route: SOURCE,
          message: `Redis reconnecting attempt ${retries + 1}/${REDIS_RECONNECT_MAX_RETRIES}`,
        });
        return Math.min(retries * REDIS_RECONNECT_BASE_DELAY_MS, REDIS_RECONNECT_MAX_DELAY_MS); // exponential backoff
      },
    },
  });

  // Event listeners
  //these fire outside any request context, so they must
  // log themselves; nothing downstream will catch or report them otherwise.
  client.on("connect", () => logDebug({ route: SOURCE, message: "Connecting to Redis" }));
  client.on("ready", () => logInfo({ route: SOURCE, message: "Redis is connected and ready" }));
  client.on("end", () => logInfo({ route: SOURCE, message: "Redis connection closed" }));
  client.on("reconnecting", () => logWarn({ route: SOURCE, message: "Redis reconnecting" }));

  client.on("error", (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = (error as ErrorWithCode).code;

    // Ignore ECONNRESET if client is in shutdown mode
    if (code === "ECONNRESET" && (!client || !client.isOpen)) {
      logDebug({ route: SOURCE, message: "Ignored ECONNRESET after client quit (safe to ignore)" });
      return;
    }

    logError(
      { route: SOURCE, status: 500, message: "Redis runtime event error", detail: `code=${code}` },
      error
    );
  });

  // Connection attempt
  try {
    logDebug({ route: SOURCE, message: "Attempting to connect to Redis" });
    await client.connect();
    resetIdleTimer();
    logInfo({ route: SOURCE, message: "Redis connection established" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = (error as ErrorWithCode).code;
    const errMsg = getErrorMessage(error); // it does soemthing like error.message

    client = null;

    if (error.message.includes("WRONGPASS")) {
      logError(
        { route: SOURCE, status: 500, message: "Redis authentication failed — check credentials", detail: `code=${code}` },
        error
      );
      throw new RedisError("REDIS_AUTH_FAILED", error.message, error.stack);
    }

    if (code === "ECONNREFUSED") {
      logError(
        { route: SOURCE, status: 503, message: "Redis connection refused — host reachable but nothing listening", detail: errMsg },
        error
      );
      throw new RedisError("REDIS_HOST_NOT_FOUND", error.message, error.stack);
    }

    if (code === "ENOTFOUND") {
      logError(
        { route: SOURCE, status: 503, message: "Redis host not found — check REDIS_HOST value", detail: errMsg },
        error
      );
      throw new RedisError("REDIS_HOST_NOT_FOUND", error.message, error.stack);
    }

    if (code === "ECONNRESET") {
      logError(
        { route: SOURCE, status: 503, message: "Redis connection reset by peer", detail: errMsg },
        error
      );
      throw new RedisError(
        "REDIS_CONNECTION_RESET",
        error.message,
        error.stack
      );
    }

    if (
      code === "ETIMEDOUT" ||
      error.message.includes("Connection timeout")
    ) {
      logError(
        { route: SOURCE, status: 503, message: "Redis connection timed out", detail: errMsg },
        error
      );
      throw new RedisError(
        "REDIS_CONNECTION_TIMEOUT",
        error.message,
        error.stack
      );
    }

    if (code === "EHOSTUNREACH") {
      logError(
        { route: SOURCE, status: 503, message: "Redis host unreachable", detail: errMsg },
        error
      );
      throw new RedisError(
        "REDIS_HOST_UNREACHABLE",
        error.message,
        error.stack
      );
    }

    logError(
      { route: SOURCE, status: 503, message: "Redis error during connection attempt", detail: errMsg },
      error
    );
    throw new RedisError(
      "REDIS_CONNECTION_FAILED",
      error.message,
      error.stack
    );

  }

  return client;
};

/**
 * Registers process signal handlers to quit the Redis client cleanly on
 * shutdown. Call this ONCE from your app's bootstrap (e.g. Next.js
 * instrumentation.ts `register()`), not from a standalone script — a
 * separate `node` process has its own module state and cannot reach the
 * live app's `client` instance.
 */

let shutdownRegistered = false;

export function registerRedisGracefulShutdown() {
   // instrumentation.ts's register() can run more than once during dev
  // hot-reloads — without this guard, each call stacks another SIGTERM/
  // SIGINT listener, which eventually trips Node's max-listener warning.
  if (shutdownRegistered) return;

  shutdownRegistered = true;
  
  const handleSignal = (signal: string) => async () => {
    logInfo({ route: SOURCE, message: `Received ${signal}, closing Redis connection` });
    await quitClient();
    process.exit(0);
  };
 
  process.on("SIGTERM", handleSignal("SIGTERM"));
  process.on("SIGINT", handleSignal("SIGINT"));
}