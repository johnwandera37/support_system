import { POST } from "@/app/api/auth/signup/route";
import { createRouteRequest, TestContext, createTestTracker } from "../testHelpers";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/hash";

export default function describeSignup(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  const signup = async (body: any) => {
    const { req } = createRouteRequest("POST", "http://localhost/api/register", "", undefined, body);
    const res = await POST(req);
    const data = await res.json();
    return { res, data };
  };

  describe("POST /api/register", () => {
    it("should reject signup while the default admin account still has default credentials", async () => {
      // Seed the literal hardcoded admin@example.com ADMIN row this route checks for.
      const defaultAdmin = await prisma.user.create({
        data: {
          email: "admin@example.com",
          password: await hashPassword("whatever"),
          name: "Default Admin",
          role: "ADMIN",
          protected: false,
        },
      });

      try {
        const { res, data } = await signup({
          name: "New User",
          email: "should-not-be-created@example.com",
          password: "ValidPass123!",
        });
        expect(res.status).toBe(403);
        expect(data.error).toBe("Signup is disabled until the admin account is updated.");
      } finally {
        // Always clean this up in the same test — every other signup test in
        // this file assumes no default-admin row exists.
        await prisma.user.delete({ where: { id: defaultAdmin.id } });
      }
    });

    it("should reject an invalid signup payload", async () => {
      const { res, data } = await signup({ name: "A", email: "not-an-email", password: "123" });
      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("should reject signup with an email already in use", async () => {
      const email = `signup-dupe-${Date.now()}@example.com`;
      const existing = await prisma.user.create({
        data: { email, password: await hashPassword("Test123!"), name: "Existing", role: "USER", protected: false },
      });
      tracker.trackUser(existing.id);

      const { res, data } = await signup({ name: "New User", email, password: "ValidPass123!" });
      expect(res.status).toBe(409);
      expect(data.error).toBe("Email already in use");
    });

    it("should create a new USER account on valid signup", async () => {
      const email = `signup-success-${Date.now()}@example.com`;
      const { res, data } = await signup({ name: "Brand New User", email, password: "ValidPass123!" });

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User registered successfully");

      const created = await prisma.user.findUnique({ where: { email } });
      expect(created).not.toBeNull();
      expect(created?.role).toBe("USER");
      expect(created?.wantsToBeAgent).toBe(false);
      if (created) tracker.trackUser(created.id); // signup doesn't return an id, so track by looking it up
    });

    it("should respect wantsToBeAgent flag on signup", async () => {
      const email = `signup-agent-req-${Date.now()}@example.com`;
      const { res } = await signup({ name: "Wants Agent", email, password: "ValidPass123!", wantsToBeAgent: true });

      expect(res.status).toBe(200);
      const created = await prisma.user.findUnique({ where: { email } });
      expect(created?.wantsToBeAgent).toBe(true);
      expect(created?.role).toBe("USER"); // still USER until an admin approves
      if (created) tracker.trackUser(created.id);
    });
  });
}