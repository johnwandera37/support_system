//Verify JWT to decoded user data from the access token
import { verifyAccessToken } from "./jwt";
import { NextResponse } from "next/server";
import { nextWarnResponse } from "@/utils/responseUtils";

type DecodedUser = { id: string; role: string };

// Shared core: extract + verify. Not exported — internal only.
function resolveToken(req: Request, route: string): DecodedUser | NextResponse {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
     return nextWarnResponse("You need to be logged in to continue.", 401, {
      route,
      detail: "Missing or malformed Authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  const result = verifyAccessToken<DecodedUser>(token, route);
  if (!result.success) return result.response;
 
  return result.payload;
}

// get authenticated user
export async function getUserFromToken(req: Request, route: string): Promise<DecodedUser| NextResponse> {
  return resolveToken(req, route);
}

// get authorized user
export function authorize(roles: string[] = []) {
  return async function middleware(req: Request, route: string) {
    const result = resolveToken(req, route);

    if (result instanceof NextResponse) return result; // already a 401

    if (roles.length && !roles.includes(result.role)) {
       return nextWarnResponse("You don't have permission to do this.", 403, {
        route,
        detail: "Role not permitted",
        meta: { userId: result.id, role: result.role, allowedRoles: roles },
      });
    }

    return { authorized: true, user: result };
  };
}
