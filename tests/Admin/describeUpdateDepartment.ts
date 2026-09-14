import { PATCH } from "@/app/api/admin/agents/[id]/department/route"; // CONFIRM this path
import { createRouteRequest, createApprovedAgent, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";

export default function describeUpdateDepartment(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  const updateDept = async (token: string, id: string, body: any) => {
    const { req, params } = createRouteRequest("PATCH", `http://localhost/api/admin/agents/${id}/department`, token, { id }, body);
    const res = await PATCH(req, { params });
    const data = await res.json();
    return { res, data };
  };

  describe("PATCH /api/admin/agents/{id}/department", () => {
    authorizationRoleChecks({
      method: "PATCH",
      url: "http://localhost/api/admin/agents/placeholder/department",
      routeHandler: PATCH,
      rolesAllowed: ["ADMIN"],
      getTokens: () => ctx.tokens,
      getParams: () => ({ id: "placeholder" }),
      getBody: () => ({ department: "Support" }),
    });

    it("should reject a target who isn't an approved agent", async () => {
      // ctx.users.agent has role AGENT but no AgentProfile / isApproved flag —
      // exactly the "not a real approved agent" case this guard exists for.
      const { res, data } = await updateDept(ctx.tokens.adminToken, ctx.users.agent.id, { department: "Support" });
      expect(res.status).toBe(404);
      expect(data.error).toBe("Agent not found or not approved");
    });

    it("should reject a missing department field", async () => {
      const agent = await createApprovedAgent();
      tracker.trackUser(agent.id);

      const { res, data } = await updateDept(ctx.tokens.adminToken, agent.id, {});
      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error.department");
    });

    it("should update the department for a valid approved agent", async () => {
      const agent = await createApprovedAgent("Billing");
      tracker.trackUser(agent.id);

      const { res, data } = await updateDept(ctx.tokens.adminToken, agent.id, { department: "Technical Support" });
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.department).toBe("Technical Support");
    });
  });
}