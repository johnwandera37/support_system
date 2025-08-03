import 'dotenv/config'; //for widely across entire app, even in standalone scripts

// REDIS
const REDIS_HOST = process.env.REDIS_HOST || '';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 0;
const REDIS_USERNAME = process.env.REDIS_USERNAME || '';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// SUPPORT EMAIL
const ORG_SUPPORT_EMAIL = process.env.ORG_SUPPORT_EMAIL || '';
const ORG_EMAIL_PASS = process.env.ORG_EMAIL_PASS || '';

// JWT
const ACCESS_TOKEN_MAX_AGE = Number(process.env.ACCESS_TOKEN_MAX_AGE) || 60 * 15; //15 min
const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_MAX_AGE) || 60 * 60 * 24 * 7; //7 days

// ENDPOINTS
const baseURL = process.env.BASE_URL || "http://localhost:3000/";

export const endpoints = {
  // Auth
  login: "api/auth/login",
  register: "api/auth/signup",
  refresh: "api/auth/refresh",
  logout: "api/auth/logout",
  accessToken: "api/auth/access-token",
  getMe: "api/auth/me",

  // Tickets
  tickets: "api/tickets/",
  ticket: "api/ticket/",
};

export {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_USERNAME,
    REDIS_PASSWORD,
    ORG_SUPPORT_EMAIL,
    ORG_EMAIL_PASS,
    ACCESS_TOKEN_MAX_AGE,
    REFRESH_TOKEN_MAX_AGE,
    baseURL,
}