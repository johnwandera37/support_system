import prisma from "@/lib/db";
import { createAndTrackTicket, createRouteRequest, createTestComment, TestContext, createTestTracker } from "../testHelpers";
import { PUT } from "@/app/api/comments/[id]/route";

export default function describePUT(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  describe("PUT /api/comments/{id}", () => {
    it("should allow user to update their own public comment within time window", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const comment = await createTestComment("Initial public comment", ticket.id, ctx.users.user.id, false);

      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${comment.id}`,
        ctx.tokens.userToken,
        { id: comment.id },
        { content: "Updated public comment" }
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.content).toBe("Updated public comment");
      expect(data.editedAt).toBeTruthy();
    });

    it("should reject updates after 15 minutes", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const oldComment = await createTestComment("Old comment", ticket.id, ctx.users.user.id, false, {
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      });

      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${oldComment.id}`,
        ctx.tokens.userToken,
        { id: oldComment.id },
        { content: "Attempt to update old comment" }
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("within 15 minutes");
      // no manual cleanup needed — swept by tracker via ticket.id
    });

    it("should reject invalid request body", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const comment = await createTestComment("Some content", ticket.id, ctx.users.user.id, false);

      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${comment.id}`,
        ctx.tokens.userToken,
        { id: comment.id },
        {}
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error.content");
    });

    it("should reject user updating someone else's comment", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const otherComment = await createTestComment("Other user comment", ticket.id, ctx.users.agent.id, false);

      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${otherComment.id}`,
        ctx.tokens.userToken,
        { id: otherComment.id },
        { content: "Malicious update attempt" }
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toMatch(/only modify your own comments/i);
    });

    it("should reject updates on a closed ticket", async () => {
      const closedTicket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "CLOSED" });
      const closedComment = await createTestComment("Comment on closed ticket", closedTicket.id, ctx.users.user.id, false);

      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${closedComment.id}`,
        ctx.tokens.userToken,
        { id: closedComment.id },
        { content: "Trying to update on closed ticket" }
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toMatch(/closed tickets/i);
    });
  });
}