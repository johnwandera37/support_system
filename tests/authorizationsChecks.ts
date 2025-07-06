import { createRouteRequest } from "./testHelpers";

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

// export function authorizationRoleChecks({
//   method,
//   url,
//   routeHandler,
//   rolesAllowed,
//   tokens,
//   getBody,
//   getParams,
// }: DescribeAuthorizationOptions) {
 
//     it("should reject missing token with 401", async () => {
//       const { req, params } = createRouteRequest(
//         method,
//         url,
//         "", // No token
//         getParams?.(),
//         getBody?.()
//       );
//       const res = await routeHandler(req, { params });
//       const data = await res.json();

//       expect(res.status).toBe(401);
//       expect(data.error).toMatch(/unauthorized/i);
//     });

//     it("should reject invalid token with 401", async () => {
//       const { req, params } = createRouteRequest(
//         method,
//         url,
//         "Bearer some.invalid.token",
//         getParams?.(),
//         getBody?.()
//       );
//       const res = await routeHandler(req, { params });
//       const data = await res.json();

//       expect(res.status).toBe(401);
//       expect(data.error).toMatch(/invalid token/i);
//     });

//     const allRoles = ["USER", "AGENT", "ADMIN"];
//     const disallowedRoles = allRoles.filter((r) => !rolesAllowed.includes(r));

//     disallowedRoles.forEach((role) => {
//       const tokenKey = `${role.toLowerCase()}Token`;
//       const token = tokens[tokenKey];
//       if (token) {
//         it(`should reject role "${role}" with 403`, async () => {
//           const { req, params } = createRouteRequest(
//             method,
//             url,
//             token,
//             getParams?.(),
//             getBody?.()
//           );
//           const res = await routeHandler(req, { params });
//           const data = await res.json();

//           expect(res.status).toBe(403);
//           expect(data.error).toMatch(/forbidden/i);
//         });
//       }
//     });

//     rolesAllowed.forEach((role) => {
//       const tokenKey = `${role.toLowerCase()}Token`;
//       const token = tokens[tokenKey];
      
//       if (token) {
//         it(`should allow role "${role}" to pass authorization`, async () => {
//           const { req, params } = createRouteRequest(
//             method,
//             url,
//             token,
//             getParams?.(),
//             getBody?.()
//           );
//           const res = await routeHandler(req, { params });

//           // Allow any result that's NOT 401 or 403
//           expect([401, 403]).not.toContain(res.status);
//         });
//       }
//     });

// }


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
    const { req, params } = getRequest("");
    const res = await routeHandler(req, { params });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  // Test invalid token
  it("should reject invalid token with 401", async () => {
    const { req, params } = getRequest("Bearer some.invalid.token");
    const res = await routeHandler(req, { params });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toMatch(/invalid token/i);
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
    'should reject unauthorized roles with 403',
    async ({ role, token }) => {
      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toMatch(/forbidden/i);
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
    'should allow authorized roles to pass authorization',
    async ({ role, token }) => {
      const { req, params } = getRequest(token);
      const res = await routeHandler(req, { params });
      expect([401, 403]).not.toContain(res.status);
    }
  );
}

