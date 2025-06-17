// This API, fetches all the agents who requested to become agents,
//  then they can be dispayed in the admin dashboard from front end

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";

export async function GET(req: Request) {
  const auth = await authorize(["ADMIN"])(req);

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

    return NextResponse.json({ success: true, data: agentRequests });
  } catch (error) {
    errLog("❌ Failed to fetch agent requests", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
