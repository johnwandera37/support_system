// This API, fetches all the agents who requested to become agents,
//  then they can be dispayed in the admin dashboard from front end

import prisma from "@/lib/db";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";
import { apiResponse, nextErrorResponse } from "@/utils/responseUtils";

const ROUTE = endpoints.agentRequests;

export async function GET(req: Request) {
  const auth = await authorize(["ADMIN"])(req, ROUTE);

  if (!("authorized" in auth)) return auth;

  try {
    const agentRequests = await prisma.user.findMany({
      where: {
        wantsToBeAgent: true,
        isApproved: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        wantsToBeAgent: true,
        isApproved: true,
      },
    });

    return apiResponse({
      status: 200,
      message: "Agent requests fetched successfully",
      data: agentRequests,
      route: ROUTE,
      logMeta: { count: agentRequests.length },
    });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to fetch agent requests" });
  }
}
