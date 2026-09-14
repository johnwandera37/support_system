// me.ts calls cookies() from "next/headers" directly (no `req` param), so
// unlike every other route we've tested, there's no Request object to
// attach a Cookie header to. next/headers's cookies() only works inside a
// real Next.js request context, which Jest doesn't provide — so we mock
// the module and control exactly what .get() returns per test.

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";
import { GET } from "@/app/api/auth/me/route";
import { TestContext } from "../testHelpers";
import { signToken } from "@/lib/jwt";

const mockedCookies = cookies as jest.Mock;

function mockAccessTokenCookie(value: string | undefined) {
  mockedCookies.mockResolvedValue({
    get: (name: string) => (name === "access_token" && value !== undefined ? { value } : undefined),
  });
}

export default function describeMe(ctx: TestContext) {
  describe("GET /api/auth/me", () => {
    afterEach(() => {
      mockedCookies.mockReset();
    });

    it("should reject when there's no access_token cookie", async () => {
      mockAccessTokenCookie(undefined);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("You need to be logged in to continue.");
    });

    it("should reject a malformed access token", async () => {
      mockAccessTokenCookie("not.a.valid.jwt");
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid session. Please log in again.");
    });

    it("should return the authenticated user's data for a valid token", async () => {
      const token = signToken({ id: ctx.users.user.id, role: ctx.users.user.role });
      mockAccessTokenCookie(token);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toMatchObject({
        id: ctx.users.user.id,
        email: ctx.users.user.email,
        role: ctx.users.user.role,
      });
    });
  });
}