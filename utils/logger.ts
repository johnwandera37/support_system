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
  }
};
