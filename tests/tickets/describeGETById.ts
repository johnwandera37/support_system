// GET /api/tickets/{id}

import { GET } from "@/app/api/tickets/[id]/route";
import { createAndTrackTicket, createRouteRequest, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";

export default function describeGETById(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  describe("GET /api/tickets/{id}", () => {
    it("should return the ticket with comments for its owning USER", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req, params } = createRouteRequest("GET", `http://localhost/api/tickets/${ticket.id}`, ctx.tokens.userToken, {
        id: ticket.id,
      });

      const res = await GET(req, { params });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe(ticket.id);
      expect(data).toHaveProperty("comments");
      expect(data).toHaveProperty("privateComments");
    });

    it("should allow AGENT to view a ticket that isn't theirs", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req, params } = createRouteRequest("GET", `http://localhost/api/tickets/${ticket.id}`, ctx.tokens.agentToken, {
        id: ticket.id,
      });

      const res = await GET(req, { params });
      expect(res.status).toBe(200);
    });

    it("should reject a USER viewing another user's ticket with 404", async () => {
      const othersTicket = await createAndTrackTicket(tracker, ctx.users.agent.id);
      const { req, params } = createRouteRequest("GET", `http://localhost/api/tickets/${othersTicket.id}`, ctx.tokens.userToken, {
        id: othersTicket.id,
      });

      const res = await GET(req, { params });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });

    it("should return 404 for a non-existent ticket id", async () => {
      const { req, params } = createRouteRequest("GET", "http://localhost/api/tickets/does-not-exist", ctx.tokens.adminToken, {
        id: "does-not-exist",
      });

      const res = await GET(req, { params });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });
  });
}