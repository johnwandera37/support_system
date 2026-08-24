import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

// Dynamic import() here (not a static top-level import) 
// matches the pattern Sentry's own setup already uses 
// in this file — keeps lib/redis (and its redis package dependency) 
// out of the edge bundle entirely, since edge functions 
// can't use Node-only modules like net
    const { registerRedisGracefulShutdown } = await import("@/lib/redis");
    registerRedisGracefulShutdown();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
