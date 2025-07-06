import { POST } from "@/app/api/comments/route";
import prisma from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { signToken } from "@/lib/jwt";
import { log } from "@/utils/logger";

// For ref purposes

describe("POST /api/comments", () => {
  let token: string;
  let ticketId: string;

  const testEmail = "test-user-comment@example.com";
  const testPassword = "Test123";
  const testName = "Test User";

  beforeAll(async () => {
    // Seed a test user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: testPassword, // You can use bcrypt or mock it
        name: testName,
        role: Role.USER, //For testing we can create any user role
        protected: false, // ✅ mark this as deletable
      },
    });

    // Generate JWT for that user
    token = signToken({ id: user.id, role: user.role }); // must return a valid signed token

    // Seed a ticket
    const ticket = await prisma.ticket.create({
      data: {
        title: "Test ticket",
        description: "Issue for testing comments",
        priority: "HIGH",
        status: "OPEN",
        userId: user.id,
      },
    });

    ticketId = ticket.id;
  });

  it("should create a comment and return 201", async () => {
    const body = {
      content: "This is a test comment",
      ticketId,
    };

    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    const data = await res.json();

    log("Success data", data);

    expect(res.status).toBe(201);
    expect(data).toHaveProperty("id");
    expect(data.content).toBe(body.content);
    expect(data.ticketId).toBe(body.ticketId);
  });

  afterAll(async () => {
    // Clean up the test DB
    await prisma.comment.deleteMany({
      where: {
        ticketId,
      },
    });

    await prisma.ticket.deleteMany({
      where: {
        id: ticketId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: testEmail,// Delete user that was created during this test
        protected: false, // ✅ Only deletes safe test users
      },
    });
  });
});
