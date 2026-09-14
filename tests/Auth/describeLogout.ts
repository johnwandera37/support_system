import { POST } from "@/app/api/auth/logout/route"; // CONFIRM this path matches your actual file location
import { createCookieRequest, createRefreshSession, getRedisSession, TestContext } from "../testHelpers";

export default function describeLogout(ctx: TestContext) {
  describe("POST /api/auth/logout", () => {
    it("should reject when no cookies are sent at all", async () => {
      const req = createCookieRequest("http://localhost/api/auth/logout", "POST", {});
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("You need to be logged in to continue.");
    });

    it("should reject when a cookie header exists but has no refresh_token", async () => {
      const req = createCookieRequest("http://localhost/api/auth/logout", "POST", { some_other_cookie: "value" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Your session has expired. Please log in again.");
    });

    it("should reject a malformed refresh token", async () => {
      const req = createCookieRequest("http://localhost/api/auth/logout", "POST", { refresh_token: "not.a.valid.jwt" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid session. Please log in again.");
    });

    it("should log out successfully and delete the Redis session", async () => {
      const { refreshToken, sessionId } = await createRefreshSession(ctx.users.user.id, ctx.users.user.role);

      const req = createCookieRequest("http://localhost/api/auth/logout", "POST", { refresh_token: refreshToken });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Logout successful.");

      // Confirm the session was actually invalidated server-side, not just
      // that the route returned 200 — this is the behavior that actually matters.
      const sessionAfter = await getRedisSession(sessionId).catch(() => null);
      expect(sessionAfter).toBeNull();
    });
  });
}