// This API updates users department seperately for an agent
// http://localhost:3000/api/admin/agents/cms3p2btm0000thvxuv0c9237/department

import prisma from "@/lib/db";
import { authorize } from "@/lib/auth";
import { endpoints } from "@/config/constants";
import { apiResponse, nextWarnResponse, nextErrorResponse, badRequestFromZod } from "@/utils/responseUtils";
import { updateAgentDepartmentSchema } from "@/lib/zodSchema";

const ROUTE = endpoints.updateAgentDepartment;

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["ADMIN"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;


  const params = await props.params;
  const { id } = params;

  let body: { department?: string };
  try {
    body = await req.json();
  } catch {
    return nextWarnResponse("Request body must be valid JSON", 400, { route: ROUTE });
  }

  const parsed = updateAgentDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestFromZod(parsed.error, 400, { route: ROUTE });
  }

  const { department } = parsed.data;

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
      return nextWarnResponse("Agent not found or not approved", 404, { route: ROUTE, meta: { agentId: id } });
    }


    const updated = await prisma.agentProfile.update({
      where: { userId: id },
      data: { department },
    });

    return apiResponse({
      status: 200,
      message: "Agent department updated successfully",
      data: updated,
      route: ROUTE,
      logMeta: { agentId: id, department },
    });
  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to update agent department" });
  }
}
