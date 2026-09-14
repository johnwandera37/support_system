jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";
import { GET } from "@/app/api/auth/access-token/route";
import { TestContext } from "../testHelpers";
import { signToken } from "@/lib/jwt";
import jwt from "jsonwebtoken";

const mockedCookies = cookies as jest.Mock;

function mockAccessTokenCookie(value: string | undefined) {
  mockedCookies.mockResolvedValue({
    get: (name: string) => (name === "access_token" && value !== undefined ? { value } : undefined),
  });
}

export default function describeAccessToken(ctx: TestContext) {
  describe("GET /api/auth/access-token", () => {
    afterEach(() => {
      mockedCookies.mockReset();
    });

    it("should reject when there's no access_token cookie", async () => {
      mockAccessTokenCookie(undefined);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("No access token");
    });

    it("should reject a token that decodes but has no exp claim", async () => {
      // A token signed WITHOUT expiresIn — jwt.decode() will succeed but
      // decoded.exp will be undefined, hitting the route's explicit check.
      const noExpToken = jwt.sign({ id: ctx.users.user.id, role: ctx.users.user.role }, "irrelevant-since-this-route-only-decodes");
      mockAccessTokenCookie(noExpToken);

      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid token");
    });

    it("should reject a value that isn't a JWT at all", async () => {
      mockAccessTokenCookie("not-a-jwt-string");
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid token");
    });

    it("should return the token and its remaining expiry for a valid token", async () => {
      const token = signToken({ id: ctx.users.user.id, role: ctx.users.user.role }); // has a real exp claim
      mockAccessTokenCookie(token);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.token).toBe(token);
      expect(typeof data.expiresIn).toBe("number");
      expect(data.expiresIn).toBeGreaterThan(0);
    });
  });
}

// Notes
// jest.mock("next/headers", ...) is file-scoped — since describeMe.ts and describeAccessToken.ts both mock the same module independently, and Jest normally isolates mocks per test file (not per describe block), this should be safe since each is its own file. But if auth.test.ts somehow imports both into the same file context in a way that causes the mocks to collide, that's the first thing to check if something behaves strangely.
// access-token.ts's "no exp claim" test — I signed a token with plain jwt.sign() and a throwaway secret string rather than your real ACCESS_SECRET, since this route only ever calls jwt.decode() (no signature verification, per that route's own security comment) — the secret used to sign it is irrelevant to decode(). Worth confirming that assumption holds if jsonwebtoken's decode() behavior surprises you here.

// jest.mock("next/headers"): this is the standard, accepted way to test Next.js App Router handlers that call cookies()/headers() directly instead of taking a Request param — there's no alternative that doesn't involve spinning up a real Next server. One nuance worth knowing, not worrying about: Jest gives each test file its own isolated module registry by default, so this mock never leaks into describeAccessToken.ts or any other file — safe as written. The one honest limitation: this tests the route's own logic correctly, but doesn't prove Next's real request pipeline correctly wires cookies into next/headers in production — that plumbing is Next's own responsibility, not something your test suite needs to reprove.

// The "no exp claim" test: also fine, and here's why the throwaway secret doesn't matter — access-token.ts only ever calls jwt.decode(), never jwt.verify() (that's the whole point of the security comment in the route itself: it's metadata-only, not an auth check). decode() never inspects the signature, so signing with a nonsense secret and no expiresIn produces exactly what the test needs: a real JWT with no exp claim. The only thing that would break this test is if that route ever switched to verify() — which would be a deliberate, visible change to the route itself, not a silent drift.