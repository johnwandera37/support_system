// app/api/me/route.ts
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import { getUserById } from "@/utils/getUserById";
import { endpoints } from "@/config/constants";
import { apiResponse, nextErrorResponse, nextWarnResponse } from "@/utils/responseUtils";

const ROUTE = endpoints.getMe;

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("access_token")?.value;

    if (!accessToken) {
      return nextWarnResponse("You need to be logged in to continue.", 401, {
        route: ROUTE,
        detail: "Missing access_token cookie",
      });
    }

    const verifyResult = verifyAccessToken<{ id: string; role: string }>(accessToken, ROUTE);
    if (!verifyResult.success) return verifyResult.response;

    const { payload } = verifyResult;
    const user = await getUserById(payload.id);

    if (!user) {
      return nextWarnResponse("Account not found.", 404, {
        route: ROUTE,
        detail: "verifyAccessToken succeeded but no matching user in DB",
        meta: { userId: payload.id },
      });
    }

    return apiResponse({
      status: 200,
      message: "User fetched successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      route: ROUTE,
      detail: "Authenticated user data returned",
      logMeta: { userId: user.id },
    });
  } catch (err) {
    return nextErrorResponse(err, 500, {
      route: ROUTE,
      message: "Failed to fetch user data",
    });
  }
}
