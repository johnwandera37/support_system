export const getErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown error";

  // 1. If it's an Error instance, use its message
  if (error instanceof Error) {
    return error.message;
  }

  // 2. Handle Cloudinary or similar structured errors
  if (typeof error === "object") {
    try {
      const errObj = error as any;

      // Check for nested message (e.g., error.error.message)
      if (errObj?.error?.message) {
        return errObj.error.message;
      }

      // Check for top-level message
      if (errObj?.message) {
        return errObj.message;
      }

      // Fallback to JSON representation
      return JSON.stringify(error, null, 2);
    } catch {
      // Edge case: object couldn't be parsed
      return "An unknown object error occurred.";
    }
  }

  // 3. If it's a string or something else
  return String(error);
};
