import z from "zod/v4";
import { getRegistry } from "../registry";

// Reusabble objects
// Entire 401 from authorization fn
const authFnResult = {
  description: "Authentication failed",
  content: {
    "application/json": {
      schema: z.object({
        error: z.string().openapi({
          example: "Unauthorized - Missing or invalid token",
        }),
      }),
      examples: {
        missingToken: {
          summary: "Missing token",
          description: "If the access token is not provided",
          value: {
            error: "Unauthorized",
          },
        },
        invalidToken: {
          summary: "Invalid token",
          description:
            "If invalid access token is provided or token expired",
          value: {
            error: "Invalid token",
          },
        },
      },
    },
  },
};

// If there are other 403 apart from this one (from authorization fun)
const forbiddenAuthFnResult = {
  summary: "Specified role required",
  description: "Specified role access required",
  value: {
    error: "Forbidden",
  },
};

// If its the only 403 in that route (from authorization fun)
const forbidden403OnlyAuthFnResult = {
  description: "Authorization failed - Specified role access required (Specic user with specific role)",
  content: {
    "application/json": {
      schema: z.object({
        error: z.string().openapi({
          example: "Forbidden",
        }),
      }),
    },
  },
};

// get user data, id and role from access token 401 erros(Admin only)
const getUserDataFromATerrExamples = {
  missingToken: {
    summary: "Missing token",
    description: "If the admin access token is not provided",
    value: {
      error: "Unauthorized",
    },
  },
  invalidToken: {
    summary: "Invalid token",
    description: "If invalid admin access token is provided or token expired",
    value: {
      error: "Invalid token",
    },
  },
};

const getUserDataFromATerr = {
  description: "Authentication failed - Get id and role from access token",
  content: {
    "application/json": {
      schema: z.object({
        error: z.string().openapi({
          example: "Unauthorized - Missing or invalid token",
        }),
      }),
      examples: getUserDataFromATerrExamples,
    },
  },
};

// get cookie and retrieve the refresh token
const refreshTokenFromCookieResponseErrors = {
  missingCookieHeader: {
    summary: "Missing authentication cookie header",
    description: "No cookie header at all",
    value: {
      error: "Missing authentication cookies",
    },
  },
  missingRefreshToken: {
    summary: "Missing refresh token",
    description: "Cookie header exists but no refresh token",
    value: {
      error: "Missing refresh token",
    },
  },
};

// Invalid refresh token
const invalidRefreshTokenExample = {
  summary: "Invalid token",
  description: "Refresh token verification failed",
  value: {
    error: "Invalid token",
  },
};

const ticketNotFoundFullExample = {
      description: "Ticket not found",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().openapi({
              example: "Ticket not found"
            })
          })
        }
      }
    }

const registry = getRegistry();

// server error fn
export function commonInternalError(example: string) {
  return {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: z.object({
          error: z.string().openapi({
            example,
          }),
        }),
      },
    },
  };
}

const serverErr1 = commonInternalError("Internal server error");
const serverErr2 = commonInternalError("Something went wrong");
const serverErr3 = commonInternalError("Credential update failed");
const serverErr4 = commonInternalError("An unexpected error occurred while creating the comment");
const serverErr5 = commonInternalError("Failed to update comment");

export {
  authFnResult,
  forbiddenAuthFnResult,
  forbidden403OnlyAuthFnResult,
  getUserDataFromATerr,
  registry,
  serverErr1,
  serverErr2,
  serverErr3,
  serverErr4,
  serverErr5,
  refreshTokenFromCookieResponseErrors,
  getUserDataFromATerrExamples,
  invalidRefreshTokenExample,
  ticketNotFoundFullExample
};
