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

type DescribeAuthorizationOptions = {
  method: string;
  url: string;
  routeHandler: RequestHandler;
  rolesAllowed: string[]; // e.g., ["USER", "AGENT"]
  tokens: {
    userToken: string;
    agentToken: string;
    adminToken: string;
    [key: string]: string | undefined;
  };
  getBody?: () => any;
  getParams?: () => any;
};

export function authorizationRoleChecks({
  method,
  url,
  routeHandler,
  rolesAllowed,
  tokens,
  getBody,
  getParams,
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

  // throw a friendly dev error if none of the tokens were passed
  if (!Object.values(tokens).some(Boolean)) {
  throw new Error("authorizationRoleChecks: No tokens provided for testing");
}

  // Test disallowed roles (403)
  const allRoles = ["USER", "AGENT", "ADMIN"];
  const disallowedRoles = allRoles.filter((r) => !rolesAllowed.includes(r));
  const disallowedCases = disallowedRoles
    .map((role) => {
      const tokenKey = `${role.toLowerCase()}Token`;
      return tokens[tokenKey]
        ? { role, token: tokens[tokenKey] as string }
        : null;
    })
    .filter(Boolean) as { role: string; token: string }[];

  test.each(disallowedCases)(
    "should reject role $role with 403",
    async ({ role, token }) => {
      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe("You don't have permission to do this.");
    }
  );

  // Test allowed roles
  const allowedCases = rolesAllowed
    .map((role) => {
      const tokenKey = `${role.toLowerCase()}Token`;
      return tokens[tokenKey]
        ? { role, token: tokens[tokenKey] as string }
        : null;
    })
    .filter(Boolean) as { role: string; token: string }[];

  test.each(allowedCases)(
    "should allow role $role to pass authorization",
    async ({ role, token }) => {
      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      expect([401, 403]).not.toContain(res.status);
    }
  );
}

