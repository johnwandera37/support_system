import z from "zod/v4";
import { getRegistry } from "../registry";

// Reusabble objects
// Entire 401 from authorization fn
const authFnResult = {
        description: "Missing access token cookie, or invalid/expired access token JWT",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string().openapi({ example: "You need to be logged in to continue." }),
            }),
            examples: {
              missingToken: {
                summary: "Missing access token",
                description: "If the access token is not provided",
                value: { error: "You need to be logged in to continue." },
              },
              invalidToken: {
                summary: "Invalid token",
                description:
                  "If invalid access token is provided",
                value: { error: "Invalid session. Please log in again." },
              },
              expiredToken: {
                summary: "Expired token",
                description: "If token expired",
                value: { error: "Session expired. Please log in again." },
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
          example: "You don't have permission to do this.",
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
      error: "You need to be logged in to continue.",
    },
  },
  invalidToken: {
    summary: "Invalid token",
    description: "If invalid admin access token is provided or token expired",
    value: {
      error: "Invalid session. Please log in again.",
    },
  },
};

const getUserDataFromATerr = {
  description: "Authentication failed - Get id and role from access token",
  content: {
    "application/json": {
      schema: z.object({
        error: z.string().openapi({
          example: "You need to be logged in to continue.",
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
      error: "You need to be logged in to continue.",
    },
  },
  missingRefreshToken: {
    summary: "Missing refresh token",
    description: "Cookie header exists but no refresh token",
    value: {
      error: "Your session has expired. Please log in again.",
    },
  },
};

// Invalid refresh token
const invalidRefreshTokenExample = {
  description: "Invalid refresh token",
  content: {
    "application/json": {
      schema: z.object({
        error: z.string().openapi({
          example: "Unauthorized - Invalid token",
        }),
      }),
      examples: {
        invalidToken: {
          summary: "Invalid token",
          description: "Refresh token verification failed",
          value: {
            error: "Invalid session. Please log in again.",
          },
        },
        expiredToken: {
          summary: "Expired token",
          description:
            "If token expired",
          value: {
            error: `Session expired. Please log in again.`,
          },
        },
      }
    }
  }
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


export {
  authFnResult,
  forbiddenAuthFnResult,
  forbidden403OnlyAuthFnResult,
  getUserDataFromATerr,
  registry,
  refreshTokenFromCookieResponseErrors,
  getUserDataFromATerrExamples,
  invalidRefreshTokenExample,
  ticketNotFoundFullExample
};
