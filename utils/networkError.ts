import { log } from "./console-logger";

export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;

  const err = error as any;
  const message = err?.message || "";
  const code = err?.code || ""; // Works for redis

  const indicators = [
    "Network Error",
    "Failed to fetch",
    "timeout",
    "ECONNREFUSED", // Redis server refused connection (down or unreachable)
    "ENOTFOUND", // DNS lookup failed (e.g., no internet)
    "ECONNRESET", // 	Connection forcibly closed (e.g., Redis server timeout)
    "EAI_AGAIN", // DNS temporarily failed
  ];

  return indicators.some((str) => message.includes(str) || code.includes(str));
};
