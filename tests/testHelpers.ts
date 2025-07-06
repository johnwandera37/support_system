import prisma from "@/lib/db";
import {
  PrivateComment,
  Role,
  Ticket,
  User,
  Comment,
} from "@/lib/generated/prisma/client";
import { signToken } from "@/lib/jwt";

// Test context
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
  ticket: Ticket & { id: string }; // Explicit id;
  // comments: {
  //   public: Comment & { id: string };
  //   private: PrivateComment & { id: string };
  // };
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
  const user = await prisma.user.create({
    data: {
      email: finalEmail,
      password: "Test123",
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
    assignedTo?: string;
    escalatedTo?: string;
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

// Assign ticket to agent
export async function assignTicketToAgent(
  ticketId: string,
  agentEmail: string //n/b can work with admin too
) {
  const agent = await getTestUser(agentEmail);

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
      Authorization: `Bearer ${token}`,
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

// Clear contexts, used in afterAll()
export async function cleanupTestContext(ctx: TestContext) {
  if (!ctx || !ctx.users || !ctx.ticket) {
    console.warn("Invalid or incomplete test context – skipping cleanup");
    return;
  }

  const emails = [
    ctx.users.user?.email,
    ctx.users.agent?.email,
    ctx.users.admin?.email,
  ].filter((email): email is string => !!email); // remove undefined/nulls

  const ticketId = ctx.ticket?.id;

  const cleanupTasks = [];

  if (ticketId) {
    cleanupTasks.push(
      prisma.comment.deleteMany({ where: { ticketId } }),
      prisma.privateComment.deleteMany({ where: { ticketId } }),
      prisma.ticket.delete({ where: { id: ticketId } })
    );
  }

  // ● Test suite failed to run

  //   PrismaClientKnownRequestError:
  //   Invalid `prisma.user.deleteMany()` invocation in
  //   C:\Users\user\Desktop\Development\Projects\Web development\Support System\support-system\tests\testHelpers.ts:194:19

  //     191
  //     192 if (emails.length > 0) {
  //     193   cleanupTasks.push(
  //   → 194     prisma.user.deleteMany(
  //   Foreign key constraint violated on the constraint: `Ticket_userId_fkey`

  if (emails.length > 0) {
    cleanupTasks.push(
      prisma.user.deleteMany({
        where: {
          email: { in: emails },
          protected: false,
        },
      })
    );
  }

  if (cleanupTasks.length === 0) {
    console.warn("Nothing to clean up – no valid ticket or users found");
    return;
  }

  await prisma.$transaction(cleanupTasks);
}

// Set up context for all route tests
export async function setupCommentTestContext(): Promise<TestContext> {
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

  // Seed a test ticket(Ticket must be created by a USER)
  const ticket = await createTestTicket(user.id);

  // Seeding comments initially is not ideal, let them be created from tests
  // Seed sample comments, public(created by USER ) private(create by AGENT)
  // const [publicComment, privateComment] = await Promise.all([
  //   createTestComment("Initial public comment", ticket.id, user.id, false),
  //   createTestComment("Initial private comment", ticket.id, agent.id, true),
  // ]);

  return {
    tokens: { userToken, agentToken, adminToken },
    users: { user, agent, admin },
    ticket,
    // comments: {
    //   public: publicComment,
    //   private: privateComment,
    // },
  };
}

// Extract zod errors
export const expectZodErrorOnField = (
  data: any,
  field: string,
  message?: string | RegExp
) => {
  expect(data).toHaveProperty(`error.properties.${field}.errors`);
  if (message) {
    expect(data.error.properties[field].errors[0]).toMatch(message);
  }
};

// Notes
// You can run only one test with describe.only or it.only something like npx jest tests/comments/describePOST.ts
// You can user a pattern npx jest --testNamePattern="POST" will run all POST route tests
// Match the exact test name npx jest -t "should allow user to create public comment"
// Match filename npx jest describePOST
// Checkout jest-circus or jest-runner-groups for more flexible filtering.
