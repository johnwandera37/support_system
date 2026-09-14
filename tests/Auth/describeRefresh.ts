import { POST } from "@/app/api/auth/refresh/route";
import { signRefreshToken } from "@/lib/jwt";
import { getRedisClient } from "@/lib/redis";
import { createCookieRequest, createRefreshSession, TestContext } from "../testHelpers";
import { randomUUID } from "crypto";

export default function describeRefresh(ctx: TestContext) {
  describe("POST /api/auth/refresh", () => {
    it("should reject when no cookies are sent at all", async () => {
      const req = createCookieRequest("http://localhost/api/auth/refresh", "POST", {});
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("You need to be logged in to continue.");
    });

    it("should reject a malformed refresh token", async () => {
      const req = createCookieRequest("http://localhost/api/auth/refresh", "POST", { refresh_token: "not.a.valid.jwt" });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid session. Please log in again.");
    });

    // A structurally valid, correctly-signed JWT — but its sessionId was
    // never stored in Redis (e.g. session expired/evicted, or forged token
    // with a real-looking but unknown sessionId).
    it("should reject a valid JWT whose session isn't in Redis, with 403 (not 401)", async () => {
      const orphanToken = signRefreshToken({ id: ctx.users.user.id, role: ctx.users.user.role, sessionId: randomUUID() });
      const req = createCookieRequest("http://localhost/api/auth/refresh", "POST", { refresh_token: orphanToken });
      const res = await POST(req);
      const data = await res.json();

      // Same message text as the "missing refresh token cookie" 401 case,
      // but a DIFFERENT status — this distinction matters for API consumers
      // and is easy to accidentally collapse in a future refactor.
      expect(res.status).toBe(403);
      expect(data.error).toBe("Session expired. Please log in again.");
    });

    it("should reject when the presented token doesn't match what's stored in Redis", async () => {
      const { sessionId } = await createRefreshSession(ctx.users.user.id, ctx.users.user.role);
      // Overwrite the stored session with a DIFFERENT token than the one we'll present
      const redis = await getRedisClient();
      await redis.set(`session:${sessionId}`, "a-completely-different-token", { EX: 60 });

      const mismatchedToken = signRefreshToken({ id: ctx.users.user.id, role: ctx.users.user.role, sessionId });
      const req = createCookieRequest("http://localhost/api/auth/refresh", "POST", { refresh_token: mismatchedToken });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe("Session expired. Please log in again.");

      await redis.del(`session:${sessionId}`); // cleanup — this key wasn't created via createRefreshSession's normal flow
    });

    it("should issue a new access token cookie for a valid session", async () => {
      const { refreshToken } = await createRefreshSession(ctx.users.user.id, ctx.users.user.role);
      const req = createCookieRequest("http://localhost/api/auth/refresh", "POST", { refresh_token: refreshToken });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
      expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
    });
  });
}