import { GET as getAgents } from "@/app/api/admin/agents/route";
import { GET as getAgentRequests } from "@/app/api/admin/agent-requests/route";
import { GET as getAdmins } from "@/app/api/admins/route";
import { createRouteRequest, createApprovedAgent, createAndTrackUser, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";
import { Role } from "@/lib/generated/prisma/client";
import prisma from "@/lib/db";

export default function describeReadRoutes(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  describe("GET /api/admin/agents", () => {
    authorizationRoleChecks({
      method: "GET",
      url: "http://localhost/api/admin/agents",
      routeHandler: getAgents,
      rolesAllowed: ["ADMIN"],
      getTokens: () => ctx.tokens,
    });

    it("should filter agents by department", async () => {
      const agent = await createApprovedAgent("Billing");
      tracker.trackUser(agent.id);

      const { req } = createRouteRequest("GET", "http://localhost/api/admin/agents?department=Billing", ctx.tokens.adminToken);
      const res = await getAgents(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.some((a: any) => a.id === agent.id)).toBe(true);
    });
  });

  describe("GET /api/admin/agent-requests", () => {
    authorizationRoleChecks({
      method: "GET",
      url: "http://localhost/api/admin/agent-requests",
      routeHandler: getAgentRequests,
      rolesAllowed: ["ADMIN"],
      getTokens: () => ctx.tokens,
    });

    it("should list users pending agent approval", async () => {
      const { user: pendingUser } = await createAndTrackUser(tracker, Role.USER);
      await prisma.user.update({ where: { id: pendingUser.id }, data: { wantsToBeAgent: true } });

      const { req } = createRouteRequest("GET", "http://localhost/api/admin/agent-requests", ctx.tokens.adminToken);
      const res = await getAgentRequests(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.some((u: any) => u.id === pendingUser.id)).toBe(true);
    });
  });

  describe("GET /api/admins", () => {
    authorizationRoleChecks({
      method: "GET",
      url: "http://localhost/api/admins",
      routeHandler: getAdmins,
      rolesAllowed: ["ADMIN", "AGENT"],
      getTokens: () => ctx.tokens,
    });

    it("should include the seeded admin in the list", async () => {
      const { req } = createRouteRequest("GET", "http://localhost/api/admins", ctx.tokens.adminToken);
      const res = await getAdmins(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: ctx.users.admin.id, email: ctx.users.admin.email })])
      );
    });
  });
}