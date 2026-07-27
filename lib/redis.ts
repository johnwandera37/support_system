import {
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USERNAME,
} from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog, log, warnLog } from "@/utils/logger";
import { createClient, RedisClientType } from "redis";
 
let client: RedisClientType | null = null;
let idleTimeout: NodeJS.Timeout | null = null;
let manuallyQuit = false;

// Auto-disconnect after 30s of inactivity
const IDLE_DISCONNECT_TIMEOUT = 30000;

class RedisError extends Error {
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
    manuallyQuit = true; // <-- mark as intentional quit ✅
    try {
      await client.quit();
      log("👋 Redis client quit intentionally.");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      warnLog("⚠️ Error while quitting Redis:", error.message);
    } finally {
      client = null;
    }
  }
}

const resetIdleTimer = () => {
  if (idleTimeout) clearTimeout(idleTimeout);
  idleTimeout = setTimeout(async () => {
    if (client && client.isOpen) {
      log("🛑 Closing idle Redis connection (idle timeout)...");
      await quitClient();
    }
  }, IDLE_DISCONNECT_TIMEOUT);
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (client && client.isOpen) {
    resetIdleTimer();
    log("♻️ Reusing existing Redis connection");
    return client;
  }

  if (!REDIS_HOST || !REDIS_PORT) {
    const errorMsg = "Redis configuration is incomplete";
    errLog("❌ " + errorMsg);
    throw new RedisError("REDIS_CONFIG_INCOMPLETE", errorMsg);
  }

  log("🔌 Creating new Redis client...");

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
      reconnectStrategy: (retries) => {
        // If client was quit, do NOT retry
        if (manuallyQuit) {
          return new Error("Client was quit, not reconnecting");
        }
        if (retries >= 5) {
          errLog("❌ Max Redis reconnection attempts reached");
          return false; // stop reconnecting, could return REDIS_CONNECTION_FAILED but false is fine
        }
        log(`♻️ Redis reconnecting attempt ${retries + 1}/5...`);
        return Math.min(retries * 100, 5000); // exponential backoff
      },
    },
  });

  // Event listeners
  client.on("connect", () => log("🔌 Connecting to Redis..."));
  client.on("ready", () => log("✅ Redis is connected and ready."));
  client.on("end", () => log("🛑 Redis connection closed."));
  client.on("reconnecting", () => log("♻️ Redis reconnecting..."));

  client.on("error", (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = (error as ErrorWithCode).code;

    // Ignore ECONNRESET if client is in shutdown mode
    if (code === "ECONNRESET" && (!client || !client.isOpen)) {
      log("⚠️ Ignored ECONNRESET after client quit (safe to ignore).");
      return;
    }

    errLog(
      "❌ Redis runtime event error:",
      `Code: ${code}`,
      "|",
      `Message: ${error.message}`
    );
  });

  // Connection attempt
  try {
    log("⏳ Attempting to connect to Redis...");
    await client.connect();
    resetIdleTimer();
    log("✅ Redis connection established");
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = (error as ErrorWithCode).code;

    errLog("Check code from redis on connecting attempt", code);
    const errMsg = getErrorMessage(error); // same as error.message

    errLog(
      "❌ Failed to connect to Redis || ",
      `Message: ${errMsg} ||`,
      `Code: ${code}`
    );

    client = null;

    if (error.message.includes("WRONGPASS")) {
      errLog(
        "❌ Redis authentication failed - check crecdentials",
        `Code ${code}`
      );
      throw new RedisError("REDIS_AUTH_FAILED", error.message, error.stack);
    } else if (code === "ECONNREFUSED") {
      errLog("❌ Redis host not found - check your REDIS_HOST value");
      throw new RedisError("REDIS_HOST_NOT_FOUND", error.message, error.stack);
    } else if (code === "ENOTFOUND") {
      errLog("❌ Redis host not found - check your REDIS_HOST value");
      throw new RedisError("REDIS_HOST_NOT_FOUND", error.message, error.stack);
    } else if (code === "ECONNRESET") {
      errLog("❌ Redis connection reset by peer");
      throw new RedisError(
        "REDIS_CONNECTION_RESET",
        error.message,
        error.stack
      );
    } else if (
      code === "ETIMEDOUT" ||
      error.message.includes("Connection timeout")
    ) {
      errLog("❌ Redis connection timed out");
      throw new RedisError(
        "REDIS_CONNECTION_TIMEOUT",
        error.message,
        error.stack
      );
    } else if (code === "EHOSTUNREACH") {
      errLog("❌ Redis host unreachable");
      throw new RedisError(
        "REDIS_HOST_UNREACHABLE",
        error.message,
        error.stack
      );
    } else {
      errLog("❌ Redis error in connecting attempt:", getErrorMessage(error));
      throw new RedisError(
        "REDIS_CONNECTION_FAILED",
        error.message,
        error.stack
      );
    }
  }

  return client;
};