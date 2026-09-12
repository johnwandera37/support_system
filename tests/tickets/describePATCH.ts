import { PATCH } from "@/app/api/tickets/[id]/route";
import {
  createAndTrackTicket,
  createAndTrackUser,
  createRouteRequest,
  TestContext,
  createTestTracker,
} from "../testHelpers";
import { Role } from "@/lib/generated/prisma/client";
import prisma from "@/lib/db";

export default function describePATCH(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  // Small local helper — every test here hits the same route shape, just
  // with different token/id/body combinations.
  const patch = async (token: string, ticketId: string, body: any) => {
    const { req, params } = createRouteRequest("PATCH", `http://localhost/api/tickets/${ticketId}`, token, { id: ticketId }, body);
    const res = await PATCH(req, { params });
    const data = await res.json();
    return { res, data };
  };

  describe.only("PATCH /api/tickets/{id}", () => {
    // ================================ < Auth / validation > ================================

    it("should reject missing token with 401", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { res, data } = await patch("", ticket.id, { priority: "HIGH" });
      expect(res.status).toBe(401);
      expect(data.error).toBe("You need to be logged in to continue.");
    });

    it("should reject malformed JSON body", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req, params } = createRouteRequest("PATCH", `http://localhost/api/tickets/${ticket.id}`, ctx.tokens.userToken, {
        id: ticket.id,
      });
      // Override body with intentionally malformed JSON
      const badReq = new Request(req.url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.tokens.userToken}` },
        body: "{not valid json",
      });
      const res = await PATCH(badReq, { params });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Request body must be valid JSON");
    });

    // Strict schema rejects unknown fields
    it("should reject a USER attempting to update title or description", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { title: "Original title" });
      const { res, data } = await patch(ctx.tokens.userToken, ticket.id, { title: "Sneaky new title" });

      expect(res.status).toBe(400);
      expect(data.error).toHaveProperty("_root");
      expect(data.error._root[0]).toContain('Unrecognized key: "title"');

      // confirm nothing actually changed server-side
      const unchanged = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(unchanged?.title).toBe("Original title");
    });

    it("should reject an invalid status value", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { res, data } = await patch(ctx.tokens.userToken, ticket.id, { status: "NOT_A_REAL_STATUS" });
      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error.status");
    });

    it("should return 404 for a non-existent ticket", async () => {
      const { res, data } = await patch(ctx.tokens.adminToken, "does-not-exist", { priority: "HIGH" });
      expect(res.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });

    // ================================ < USER-specific restrictions > ================================

    it("should allow a USER to update their own ticket's priority", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { priority: "LOW" });
      const { res, data } = await patch(ctx.tokens.userToken, ticket.id, { priority: "HIGH" });
      expect(res.status).toBe(200);
      expect(data.priority).toBe("HIGH");
    });

    it("should reject a USER updating another user's ticket", async () => {
      const othersTicket = await createAndTrackTicket(tracker, ctx.users.agent.id);
      const { res, data } = await patch(ctx.tokens.userToken, othersTicket.id, { priority: "HIGH" });
      expect(res.status).toBe(403);
      expect(data.error).toBe("You can only update your own tickets");
    });

    it("should reject a USER trying to update a non-priority field", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { res, data } = await patch(ctx.tokens.userToken, ticket.id, { status: "PENDING" });
      expect(res.status).toBe(403);
      expect(data.error).toBe("Users can only update ticket priority");
    });

    // ================================ < Status transitions > ================================

    it("should reject closing a ticket that isn't RESOLVED", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "OPEN", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { status: "CLOSED" });
      expect(res.status).toBe(400);
      expect(data.error).toBe("Ticket must be RESOLVED before closing");
    });

    // Using assignedTo with no status field means isReopening is false (since parsed.data.status is undefined), 
    // so it cleanly hits the CLOSED-not-reopening branch with nothing else competing for the same status code.
    it("should reject any action on a CLOSED ticket that isn't a valid reopen", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "CLOSED" });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { assignedTo: ctx.users.agent.id });
      expect(res.status).toBe(409);
      expect(data.error).toBe("This ticket does not need further actions. It has been closed.");
    });

    it("should allow reopening a CLOSED ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "CLOSED" });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { status: "OPEN" });
      expect(res.status).toBe(200);
      expect(data.status).toBe("OPEN");
    });

    it("should reject further action on a RESOLVED ticket unless admin-closing or agent-reopening", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        status: "RESOLVED",
        assignedTo: ctx.users.agent.id,
      });
      // AGENT (assigned) trying to set status to something other than OPEN/PENDING — not a valid reopen
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { status: "INPROGRESS" });
      expect(res.status).toBe(409);
      expect(data.error).toContain("does not need further actions");
    });

    it("should allow ADMIN to close a RESOLVED ticket even when unassigned", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        status: "RESOLVED",
        assignedTo: null,
      });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { status: "CLOSED" });
      expect(res.status).toBe(200);
      expect(data.status).toBe("CLOSED");
    });

    it("should allow ADMIN to reopen a RESOLVED ticket even when unassigned", async () => {
      // This was the actual bug: isValidReopen previously hardcoded AGENT-only,
      // so no admin could ever reopen a resolved ticket, assigned or not.
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        status: "RESOLVED",
        assignedTo: null,
      });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { status: "PENDING" });
      expect(res.status).toBe(200);
      expect(data.status).toBe("PENDING");
    });


    it("should allow the assigned AGENT to reopen a RESOLVED ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        status: "RESOLVED",
        assignedTo: ctx.users.agent.id,
      });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { status: "PENDING" });
      expect(res.status).toBe(200);
      expect(data.status).toBe("PENDING");
    });

    // ================================ < Assignment logic > ================================

    it("should reject an unassigned AGENT trying to modify a ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { user: otherAgent, token: otherAgentToken } = await createAndTrackUser(tracker, Role.AGENT);

      const { res, data } = await patch(otherAgentToken, ticket.id, { status: "PENDING" });
      expect(res.status).toBe(403);
      expect(data.error).toBe("Only the agent assigned to this ticket can make this update");
    });

    it("should reject assigning to an invalid/non-agent user", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { assignedTo: ctx.users.user.id });
      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid assignee");
    });

    it("should allow an AGENT to self-assign an unassigned ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { assignedTo: ctx.users.agent.id });
      expect(res.status).toBe(200);
      expect(data.assignedTo).toBe(ctx.users.agent.id);
      expect(data.status).toBe("ASSIGNED");
    });


    it("should reject an AGENT assigning a ticket to someone else", async () => {
      const { user: otherAgent } = await createAndTrackUser(tracker, Role.AGENT);
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { assignedTo: otherAgent.id });
      expect(res.status).toBe(403);
      expect(data.error).toBe("Agents can only assign tickets to themselves");
    });

    it("should reject an AGENT self-assigning an already-assigned ticket", async () => {
      const { user: otherAgent } = await createAndTrackUser(tracker, Role.AGENT);
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: otherAgent.id });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { assignedTo: ctx.users.agent.id });
      expect(res.status).toBe(400);
      expect(data.error).toContain("already being handled by");
    });

    it("should reject a no-op re-assignment to the same agent", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { assignedTo: ctx.users.agent.id });
      expect(res.status).toBe(400);
      expect(data.error).toBe("You have already assigned yourself this ticket");
    });

    it("should reject ADMIN reassigning a ticket that hasn't been escalated", async () => {
      const { user: otherAgent } = await createAndTrackUser(tracker, Role.AGENT);
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { assignedTo: otherAgent.id });
      expect(res.status).toBe(400);
      expect(data.error).toBe(
        `The current assignee, ${ctx.users.agent.name}, has not escalated this ticket, therefore reassignment is not possible`
      );
    });

    it("should reject ADMIN reassigning a ticket escalated to a different admin", async () => {
      const { user: otherAgent } = await createAndTrackUser(tracker, Role.AGENT);
      const { user: otherAdmin } = await createAndTrackUser(tracker, Role.ADMIN);
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        assignedTo: ctx.users.agent.id,
        isEscalated: true,
        escalatedTo: otherAdmin.id, // escalated to a DIFFERENT admin than the one making this request
      });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { assignedTo: otherAgent.id });
      expect(res.status).toBe(403);
      expect(data.error).toBe("Only the admin the ticket was escalated to can reassign it");
    });

    it("should allow the escalated-to ADMIN to reassign an escalated ticket", async () => {
      const { user: otherAgent } = await createAndTrackUser(tracker, Role.AGENT);
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        assignedTo: ctx.users.agent.id,
        isEscalated: true,
        escalatedTo: ctx.users.admin.id, // escalated to THIS admin
      });
      const { res, data } = await patch(ctx.tokens.adminToken, ticket.id, { assignedTo: otherAgent.id });
      expect(res.status).toBe(200);
      expect(data.assignedTo).toBe(otherAgent.id);
    });

    // ================================ < Priority guard > ================================

    it("should reject a non-USER changing ticket priority", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { priority: "LOW", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, { priority: "URGENT" });
      expect(res.status).toBe(403);
      expect(data.error).toBe("Only users can update ticket priority");
    });

    // ================================ < Escalation > ================================

    it("should reject escalating a ticket that's already escalated", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        status: "PENDING",
        assignedTo: ctx.users.agent.id,
        isEscalated: true,
        escalatedTo: ctx.users.admin.id,
      });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalationReason: "Trying to escalate again",
        escalatedTo: ctx.users.admin.id,
      });
      expect(res.status).toBe(409);
      expect(data.error).toContain("cannot be escalated again");
    });

    it("should reject escalating a ticket that isn't PENDING", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "OPEN", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalationReason: "Needs admin input",
        escalatedTo: ctx.users.admin.id,
      });
      expect(res.status).toBe(400);
      expect(data.error).toBe("Only PENDING tickets can be escalated");
    });

    it("should reject escalation with a missing reason", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "PENDING", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalatedTo: ctx.users.admin.id,
      });
      expect(res.status).toBe(400);
      expect(data.error).toBe("Escalation reason is required");
    });

    it("should reject escalation with no target admin", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "PENDING", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalationReason: "Needs admin input",
      });
      expect(res.status).toBe(400);
      expect(data.error).toBe("Please select an admin to escalate to");
    });

    it("should reject escalation to a non-existent admin", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "PENDING", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalationReason: "Needs admin input",
        escalatedTo: "does-not-exist",
      });
      expect(res.status).toBe(404);
      expect(data.error).toBe("Selected admin not found or not available");
    });

    it("should allow escalating a PENDING ticket to a valid admin", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "PENDING", assignedTo: ctx.users.agent.id, });
      const { res, data } = await patch(ctx.tokens.agentToken, ticket.id, {
        isEscalated: true,
        escalationReason: "Customer needs a refund approval",
        escalatedTo: ctx.users.admin.id,
      });
      expect(res.status).toBe(200);
      expect(data.isEscalated).toBe(true);
      expect(data.status).toBe("ESCALATED");
      expect(data.escalatedTo).toBe(ctx.users.admin.id);
    });
  });
}
