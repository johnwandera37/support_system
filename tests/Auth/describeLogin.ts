import { POST } from "@/app/api/auth/login/route";
import { createRouteRequest, TestContext, createTestTracker } from "../testHelpers";

export default function describeLogin(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  // createTestUserWithToken seeds users with a deterministic, properly
  // hashed password of the form `Test${ROLE}@123`.
  const USER_PASSWORD = "TestUSER@123";

  const login = async (body: any) => {
    const { req } = createRouteRequest("POST", "http://localhost/api/auth/login", "", undefined, body);
    const res = await POST(req);
    const data = await res.json();
    return { res, data };
  };

  describe("POST /api/login", () => {
    it("should reject an invalid payload shape", async () => {
      const { res, data } = await login({ email: "not-an-email" }); // missing password entirely
      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("should reject login for a non-existent email", async () => {
      const { res, data } = await login({ email: "does-not-exist@example.com", password: "whatever123" });
      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should reject login with the wrong password", async () => {
      const { res, data } = await login({ email: ctx.users.user.email, password: "TotallyWrongPassword" });
      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should log in successfully and set both auth cookies", async () => {
      const { res, data } = await login({ email: ctx.users.user.email, password: USER_PASSWORD });

      expect(res.status).toBe(200);
      expect(data.message).toBe("Login successful");
      expect(data.user).toMatchObject({ id: ctx.users.user.id, email: ctx.users.user.email, role: "USER" });

      const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
      expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    });
  });
}