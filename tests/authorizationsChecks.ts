// tests/authorizationsChecks.ts

import { createRouteRequest } from "./testHelpers";

/**
 * Use this ONLY for routes where 401/403 is purely about identity/role —
 * i.e. the set of roles in `rolesAllowed` is the complete story for who
 * can call this route, with no additional per-request business state
 * (ticket assignment, ticket status, etc.) also producing a 403.
 *
 * Good fit: DELETE /api/tickets/{id} (ADMIN only, no other condition).
 * Bad fit: POST /api/comments — AGENT is "allowed" by role, but still
 * gets 403 if the ticket isn't assigned to them. That's a business-rule
 * rejection, not an authorization rejection, and this helper can't tell
 * them apart — write those cases by hand instead.
 */

// A request handler type compatible with Next.js route handlers
type RequestHandler = (
  req: Request,
  props: { params: Promise<any> }
) => Promise<Response>;


// make the helper pull tokens lazily
type TokensMap = {
  userToken: string;
  agentToken: string;
  adminToken: string;
  [key: string]: string | undefined;
};

type DescribeAuthorizationOptions = {
  method: string;
  url: string;
  routeHandler: RequestHandler;
  rolesAllowed: string[]; // e.g., ["USER", "AGENT"]
  getTokens: () => TokensMap; // resolved lazily inside test bodies, not at registration time, since ctx is still empty at that point (beforeAll hasn't run yet)
  getBody?: () => any;
  getParams?: () => any;
  // Called with the parsed response body whenever an allowed role's request
  // succeeds (status < 300). Use this to track/clean up anything the route
  // actually wrote (a created ticket, comment, etc.) and/or make light
  // assertions on the shape of a successful response.
  onSuccess?: (data: any) => void;
};

export function authorizationRoleChecks({
  method,
  url,
  routeHandler,
  rolesAllowed,
  getTokens,
  getBody,
  getParams,
  onSuccess,
}: DescribeAuthorizationOptions) {

  // Shared helpers
  const getRequest = (token?: string) =>
    createRouteRequest(method, url, token ?? "", getParams?.(), getBody?.());

  // Test missing token
  it("should reject missing token with 401", async () => {
    const { req, params } = getRequest("");// No token provided
    const res = await routeHandler(req, { params });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("You need to be logged in to continue.");
  });

  // Test invalid token
  it("should reject invalid token with 401", async () => {
    const { req, params } = getRequest("Bearer some.invalid.token");// Passed as an invalid token
    const res = await routeHandler(req, { params });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid session. Please log in again.");
  });

  // Role lists are static (rolesAllowed is a plain array param, not derived
  // from ctx) so this part is safe at registration time — only the *token
  // values* need to wait for beforeAll.

  // Test disallowed roles (403)
  const allRoles = ["USER", "AGENT", "ADMIN"];
  const disallowedRoles = allRoles.filter((r) => !rolesAllowed.includes(r));

  if (disallowedRoles.length > 0) {
    test.each(disallowedRoles)("should reject role %s with 403", async (role) => {
      const tokens = getTokens(); // called now — inside the test body, after beforeAll has run
      const token = tokens[`${role.toLowerCase()}Token`];
      expect(token).toBeTruthy(); // fail loudly, not silently, if a token is missing

      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe("You don't have permission to do this.");
    });
  }
  if (rolesAllowed.length > 0) {
    test.each(rolesAllowed)("should allow role %s to pass authorization", async (role) => {
      const tokens = getTokens();
      const token = tokens[`${role.toLowerCase()}Token`];
      expect(token).toBeTruthy();

      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      expect([401, 403]).not.toContain(res.status);

      if (res.status < 300) {
        const data = await res.json();
        onSuccess?.(data);
      }
    });
    
  }
  
}

