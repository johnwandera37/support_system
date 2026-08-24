// This API fetches all agents, if department param is provided, 
// fetches user according the department assigned to them
// GET /api/admin/agents?department=support

import prisma from "@/lib/db";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";
import { apiResponse, nextErrorResponse } from "@/utils/responseUtils";

const ROUTE = endpoints.getAgentDepartments;

export async function GET(req: Request) {
  const auth = await authorize(["ADMIN"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");

  try {
    const agents = await prisma.user.findMany({
      where: {
        wantsToBeAgent: true,
        isApproved: true,
        role: "AGENT",
        agentProfile: {
          department: department ?? undefined,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        agentProfile: {
          select: {
            department: true,
          },
        },
      },
    });

    return apiResponse({
      status: 200,
      message: "Agents fetched successfully",
      data: agents,
      route: ROUTE,
      logMeta: { department: department ?? "all", count: agents.length },
    });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to fetch agents" });
  }
}

