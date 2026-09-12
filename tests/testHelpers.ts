// tests/testHelpers.ts

import prisma from "@/lib/db";
import {
  PrivateComment,
  Role,
  Ticket,
  User,
  Comment,
} from "@/lib/generated/prisma/client";
import { hashPassword } from "@/lib/hash";
import { signToken } from "@/lib/jwt";

// TestContext no longer carries a shared ticket — every test owns its own
export type TestContext = {
  tokens: {
    userToken: string;
    agentToken: string;
    adminToken: string;
  };
  users: {
    user: User & { email: string };
    agent: User & { email: string };
    admin: User & { email: string };
  };
};

export const createTestUserWithToken = async (
  role: Role,
  email?: string
): Promise<{
  token: string;
  user: User & { role: Role }; // Explicit role typing
}> => {
  const finalEmail =
    email || `test-${role.toLowerCase()}-${Date.now()}@example.com`;
  const password = `Test${role}@123`
  const hashedPswd = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: finalEmail,
      password: hashedPswd,
      name: `Test ${role}`,
      role,
      protected: false,
    },
  });

  const token = signToken({ id: user.id, role: user.role });

  return { user: { ...user, email: finalEmail }, token }; // Ensure email is included
};

// Create ticket
export const createTestTicket = async (
  userId: string,
  options?: {
    title?: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    status?: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
    assignedTo?: string | null;
    escalatedTo?: string | null;
    isEscalated?: boolean;
  }
) => {
  return prisma.ticket.create({
    data: {
      title: options?.title ?? "Test Ticket",
      description: options?.description ?? "Test description",
      priority: options?.priority ?? "MEDIUM",
      status: options?.status ?? "OPEN",
      userId,
      assignedTo: options?.assignedTo ?? null,
      escalatedTo: options?.escalatedTo ?? null,
      isEscalated: options?.isEscalated ?? false,
    },
  });
};

// Create test comment
export const createTestComment = async (
  content: string,
  ticketId: string,
  userId: string,
  isPrivate: boolean,
  options?: {
    createdAt?: Date;
    editedAt?: Date;
    deletedAt?: Date;
  }
) => {
  const data: any = {
    content: content ?? "Test Comment",
    ticketId,
    userId,
    createdAt: options?.createdAt,
    editedAt: options?.editedAt,
    deletedAt: options?.deletedAt,
  };

  return isPrivate
    ? await prisma.privateComment.create({ data })
    : await prisma.comment.create({ data });
};

// Get user with their email if they exists
export async function getTestUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`Test user ${email} not found`);
  }

  return user;
}

// Assign ticket to agent or admin
export async function assignTicketToAgent(
  ticketId: string,
  agentOrAdminEmail: string //n/b can work with admin too
) {
  const agent = await getTestUser(agentOrAdminEmail);

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedTo: agent.id },
  });
}

// Escalate ticket to admin
export async function escalateTicketToAdmin(
  ticketId: string,
  adminEmail: string,
  escalatedByEmail: string
) {
  // Ensure the admin exists
  const admin = await getTestUser(adminEmail);
  const agent = await getTestUser(escalatedByEmail);

  return await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      isEscalated: true,
      escalationReason: "Test Escalation Reason",
      escalatedBy: agent.id,
      escalatedAt: new Date(),
      escalatedTo: admin.id,
      status: "PENDING",//  make status pending to follow the escalation logic
    },
  });
}

// Helper function to create test requests
// Call the function with just method, URL, and token for GET requests
// Call with body for POST requests
// Call with params for DELETE requests
// Call with both for PUT/PATCH requests
// Fixed: previously always sent "Authorization: Bearer " even with an empty
// token, which meant "missing token" tests were actually sending an empty
// (not absent) header — hitting JWT verification instead of the
// missing-header early-return in auth code.
export const createRouteRequest = <T extends { id: string } | undefined>(
  method: string,
  url: string,
  token: string,
  params?: T,
  body?: any
): { req: Request; params: Promise<T> } => {
  const req = new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // omit header entirely when token is empty
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    req,
    params: Promise.resolve(params as T),
  };
};

// Create header
export const createAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// Renamed from setupCommentTestContext — this only seeds users/tokens now, not tickets and comments anymore
// so it's reusable across every route suite, not just comments.
export async function setupUserContext(): Promise<TestContext> {
  // Seed test users with different roles and respective tokens tokens
  const [
    { token: userToken, user },
    { token: agentToken, user: agent },
    { token: adminToken, user: admin },
  ] = await Promise.all([
    createTestUserWithToken(Role.USER),
    createTestUserWithToken(Role.AGENT),
    createTestUserWithToken(Role.ADMIN),
  ]);
  return {
    tokens: { userToken, agentToken, adminToken },
    users: { user, agent, admin },
  };
}

// Fixed: matches the actual flat {error: {field: [messages]}} shape your
// routes return (badRequestFromZod → extractFieldErrorsFromTree), not the
// raw nested Zod treeifyError() shape.
export const expectZodErrorOnField = (
  data: any,
  field: string,
  message?: string | RegExp
) => {
  expect(data).toHaveProperty(`error.${field}`);
  expect(Array.isArray(data.error[field])).toBe(true);
  if (message) {
    expect(data.error[field][0]).toMatch(message);
  }
};

// Tracks every ticket created during a test run, so one afterAll can sweep
// them (and anything attached to them) regardless of which tests ran or
// what order they ran in.
export function createTestTracker() {
  const ticketIds: string[] = [];
  const userIds: string[] = [];

  return {
    trackTicket(id: string) {
      ticketIds.push(id);
      return id;
    },
    trackUser(id: string) {
      userIds.push(id);
      return id;
    },

    // Comments don't need separate tracking — deleting by ticketId sweeps
    // every comment/privateComment attached to a tracked ticket.
    // also tracks loose-user, ones created in mid tests using createTestUserWithToken in createAndTrackUser
    async cleanup(coreUserEmails: string[]) {
      // Look up core user ids from their emails first, so notifications tied to
      // ctx.users.user/agent/admin are covered too — not just loose tracked users.
      const coreUsers = coreUserEmails.length > 0
        ? await prisma.user.findMany({ where: { email: { in: coreUserEmails } }, select: { id: true } })
        : [];
      const allUserIds = [...userIds, ...coreUsers.map((u) => u.id)];

      if (ticketIds.length > 0) {
        await prisma.$transaction([
          prisma.comment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
          prisma.privateComment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
          prisma.ticketStatusLog.deleteMany({ where: { ticketId: { in: ticketIds } } }),
          prisma.ticketAssignmentLog.deleteMany({ where: { ticketId: { in: ticketIds } } }),
          prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }),
        ]);
      }

      if (allUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: allUserIds } } });
      }
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds }, protected: false } });
      }
      if (coreUserEmails.length > 0) {
        await prisma.user.deleteMany({ where: { email: { in: coreUserEmails }, protected: false } });
      }
    },
  };
}

// Convenience: create + track in one call, since almost every test needs both
export async function createAndTrackTicket(
  tracker: ReturnType<typeof createTestTracker>,
  userId: string,
  options?: Parameters<typeof createTestTicket>[1]
) {
  const ticket = await createTestTicket(userId, options);
  tracker.trackTicket(ticket.id);
  return ticket;
}


// Convenience: create + track a one-off user in a single call
export async function createAndTrackUser(
  tracker: ReturnType<typeof createTestTracker>,
  role: Role,
  email?: string
) {
  const { user, token } = await createTestUserWithToken(role, email);
  tracker.trackUser(user.id);
  return { user, token };
}

// Every test now sets up exactly the ticket state it 
// needs and nothing else — no test depends on execution 
// order anymore, and skipping any single test with .only 
// during development no longer breaks unrelated ones.

// Notes
// You can run only one test with describe.only or it.only something like npx jest tests/comments/describePOST.ts
// You can use a pattern npx jest --testNamePattern="POST" will run all POST route tests
// Match the exact test name npx jest -t "should allow user to create public comment"
// Match filename npx jest describePOST
// Checkout jest-circus or jest-runner-groups for more flexible filtering.
