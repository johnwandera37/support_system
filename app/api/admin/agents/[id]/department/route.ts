// This API updates users department seperately for an agent

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

 
  const params = await props.params;
  const { id } = params;
  const { department } = await req.json();
 
  if (!department) {
    return NextResponse.json(
      { error: "Department is required" },
      { status: 400 }
    );
  }

  try {
    // Ensure user is an approved agent
    const user = await prisma.user.findFirst({
      where: {
        id,
        wantsToBeAgent: true,
        isApproved: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Agent not found or not approved" }, { status: 404 });
    }

    const updated = await prisma.agentProfile.update({
      where: { userId: id },
      data: { department },
    });

    return NextResponse.json({ success: true, data: updated }, {status: 200});
  } catch (error) {
    errLog("❌ Failed to update agent department", getErrorMessage(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
