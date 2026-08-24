import 'dotenv/config'; //for widely across entire app, even in standalone scripts
import { string } from 'zod/v4';

// REDIS
const REDIS_HOST = process.env.REDIS_HOST || '';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 0;
const IDLE_DISCONNECT_TIMEOUT = Number(process.env.IDLE_DISCONNECT_TIMEOUT) || 30000; // 30 seconds
const REDIS_USERNAME = process.env.REDIS_USERNAME || '';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
export const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === "true";
export const REDIS_IDLE_DISCONNECT_MS = Number(process.env.REDIS_IDLE_DISCONNECT_MS ?? 0);
export const REDIS_RECONNECT_MAX_RETRIES = Number(process.env.REDIS_RECONNECT_MAX_RETRIES ?? 10);
export const REDIS_RECONNECT_BASE_DELAY_MS = Number(process.env.REDIS_RECONNECT_BASE_DELAY_MS ?? 300);
export const REDIS_RECONNECT_MAX_DELAY_MS = Number(process.env.REDIS_RECONNECT_MAX_DELAY_MS ?? 5000);


// SUPPORT EMAIL
const ORG_SUPPORT_EMAIL = process.env.ORG_SUPPORT_EMAIL || '';
const ORG_EMAIL_PASS = process.env.ORG_EMAIL_PASS || '';

// JWT
const ACCESS_TOKEN_MAX_AGE = Number(process.env.ACCESS_TOKEN_MAX_AGE) || 60 * 15; //15 min
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15min" //15 min
const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_MAX_AGE) || 60 * 60 * 24 * 7; //7 days
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d"; //7 days

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
  ticket: "api/ticket/{id}",

  // Admin
  updateProfile: "api/admin/update-profile",
  adminAction: "api/admin/action",
  agentRequests: "api/admin/agent-requests",
  getAgentDepartments: "/api/admin/agents",
  updateAgentDepartment: "api/admin/agents/{id}/department",

  // Admins
  getAdmins: "api/admins",

  // Comments
  createOrGetComment: "api/comments/",
  updateOrDeleteComment: "api/comments/{id}",
};

export const TICKET_STATUS = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  INPROGRESS: "INPROGRESS",
  PENDING: "PENDING",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export {
    REDIS_HOST,
    REDIS_PORT,
    IDLE_DISCONNECT_TIMEOUT,
    REDIS_USERNAME,
    REDIS_PASSWORD,
    ORG_SUPPORT_EMAIL,
    ORG_EMAIL_PASS,
    ACCESS_TOKEN_MAX_AGE,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_MAX_AGE,
    REFRESH_TOKEN_EXPIRY,
    baseURL,
}