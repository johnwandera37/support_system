// This API fetches all agents, if department param is provided, 
// fetches user according the department assigned to them
// GET /api/admin/agents?department=support

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";

export async function GET(req: Request) {
  const auth = await authorize(["ADMIN"])(req);
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

    return NextResponse.json({ success: true, data: agents }, {status: 200});
  } catch (error) {
    errLog("❌ Failed to fetch agents", getErrorMessage(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
