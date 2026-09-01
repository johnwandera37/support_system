import { POST } from "@/app/api/comments/route";
import {
  createAndTrackTicket,
  createRouteRequest,
  expectZodErrorOnField,
  TestContext,
  createTestTracker,
} from "../testHelpers";

export default function describePOST(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  describe("POST /api/comments", () => {
    it("should reject missing token with 401", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", "", undefined, {
        content: "Sample content",
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("You need to be logged in to continue.");
    });

    it("should reject invalid token with 401", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        "some.invalid.token",
        undefined,
        { content: "Sample content", ticketId: ticket.id }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid session. Please log in again.");
    });

    it("should reject request with invalid schema (missing content)", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expectZodErrorOnField(data, "content", /expected string/i);
    });

    it("should reject request with missing ticketId", async () => {
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "Missing ticketId",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expectZodErrorOnField(data, "ticketId", /expected string/i);
    });

    it("should allow user to create public comment on their own ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "User public comment",
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.content).toBe("User public comment");
      expect(data.ticketId).toBe(ticket.id);
    });

    it("should allow agent to create public comment on assigned ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.agentToken, undefined, {
        content: "Agent public comment",
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Agent public comment");
    });

    it("should allow agent to create private comment on assigned ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.agentToken, undefined, {
        content: "Agent private comment",
        ticketId: ticket.id,
        isPrivate: true,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Agent private comment");
    });

    it("should allow admin to create any type of comment", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);

      const { req: publicReq } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.adminToken, undefined, {
        content: "Admin public comment",
        ticketId: ticket.id,
      });
      const { req: privateReq } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.adminToken, undefined, {
        content: "Admin private comment",
        ticketId: ticket.id,
        isPrivate: true,
      });

      const [publicRes, privateRes] = await Promise.all([POST(publicReq), POST(privateReq)]);

      expect(publicRes.status).toBe(201);
      expect(privateRes.status).toBe(201);
    });

    it("should reject user creating private comments", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "User private attempt",
        ticketId: ticket.id,
        isPrivate: true,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe("Users cannot create private comments");
    });

    it("should reject user commenting on another user's ticket", async () => {
      const otherTicket = await createAndTrackTicket(tracker, ctx.users.agent.id);
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "Cross ticket comment",
        ticketId: otherTicket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("only comment on your own tickets");
    });

    it("should reject agent creating public comment on unassigned ticket", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id); // unassigned by default
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.agentToken, undefined, {
        content: "Public comment attempt",
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("not assigned");
    });

    it("should reject agent creating private comments on unassigned tickets", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id); // unassigned by default
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.agentToken, undefined, {
        content: "Agent private attempt",
        ticketId: ticket.id,
        isPrivate: true,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("can only add private comments to their assigned tickets");
    });

    it("should reject invalid ticket IDs", async () => {
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "Invalid ticket",
        ticketId: "invalid-id",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });

    it("should reject comments on closed tickets", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "CLOSED" });
      const { req } = createRouteRequest("POST", "http://localhost/api/comments", ctx.tokens.userToken, undefined, {
        content: "Comment on closed ticket",
        ticketId: ticket.id,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("closed hence comments are not allowed");
    });
  });
}