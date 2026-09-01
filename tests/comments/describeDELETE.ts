import prisma from "@/lib/db";
import { createAndTrackTicket, createRouteRequest, createTestComment, TestContext, createTestTracker, createTestUserWithToken, createAndTrackUser } from "../testHelpers";
import { DELETE } from "@/app/api/comments/[id]/route";
import { Role } from "@/lib/generated/prisma/client";

export default function describeDELETE(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  describe("DELETE /api/comments/{id}", () => {
    it("should allow all roles to delete their own comments within the time window", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        assignedTo: ctx.users.agent.id,
        isEscalated: true,
        escalatedTo: ctx.users.admin.id,
      });

      const deleteRequests = [
        { label: "user public", token: ctx.tokens.userToken, authorId: ctx.users.user.id, isPrivate: false },
        { label: "agent public", token: ctx.tokens.agentToken, authorId: ctx.users.agent.id, isPrivate: false },
        { label: "agent private", token: ctx.tokens.agentToken, authorId: ctx.users.agent.id, isPrivate: true },
        { label: "admin public", token: ctx.tokens.adminToken, authorId: ctx.users.admin.id, isPrivate: false },
        { label: "admin private", token: ctx.tokens.adminToken, authorId: ctx.users.admin.id, isPrivate: true },
      ];

      for (const { token, authorId, isPrivate, label } of deleteRequests) {
        const comment = await createTestComment(`${label} comment`, ticket.id, authorId, isPrivate);

        const { req, params } = createRouteRequest("DELETE", `http://localhost/api/comments/${comment.id}`, token, {
          id: comment.id,
        });

        const res = await DELETE(req, { params });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Comment deleted successfully");

        const deleted = isPrivate
          ? await prisma.privateComment.findUnique({ where: { id: comment.id } })
          : await prisma.comment.findUnique({ where: { id: comment.id } });

        expect(deleted?.deletedAt).toBeTruthy();
        expect(deleted?.content).toBe("[deleted]");
      }
    });

    it("should reject deletion after the 15-minute window, for every role", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, {
        assignedTo: ctx.users.agent.id,
        isEscalated: true,
        escalatedTo: ctx.users.admin.id,
      });
      const expiredTime = new Date(Date.now() - 16 * 60 * 1000);

      const deleteRequests = [
        { label: "user public", token: ctx.tokens.userToken, authorId: ctx.users.user.id, isPrivate: false },
        { label: "agent public", token: ctx.tokens.agentToken, authorId: ctx.users.agent.id, isPrivate: false },
        { label: "agent private", token: ctx.tokens.agentToken, authorId: ctx.users.agent.id, isPrivate: true },
        { label: "admin public", token: ctx.tokens.adminToken, authorId: ctx.users.admin.id, isPrivate: false },
        { label: "admin private", token: ctx.tokens.adminToken, authorId: ctx.users.admin.id, isPrivate: true },
      ];

      for (const { token, authorId, isPrivate, label } of deleteRequests) {
        const comment = await createTestComment(`${label} old comment`, ticket.id, authorId, isPrivate, { createdAt: expiredTime });

        const { req, params } = createRouteRequest("DELETE", `http://localhost/api/comments/${comment.id}`, token, {
          id: comment.id,
        });

        const res = await DELETE(req, { params });
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.error).toMatch(/within 15 minutes/i);
      }
    });

    it("should reject deletion of someone else's comment", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
      const comment = await createTestComment("Not yours", ticket.id, ctx.users.agent.id, false);

      const { req, params } = createRouteRequest("DELETE", `http://localhost/api/comments/${comment.id}`, ctx.tokens.userToken, {
        id: comment.id,
      });

      const res = await DELETE(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toMatch(/your own comments/i);
    });

    it("should reject deletion of a private comment by an unassigned agent", async () => {
      const ticket = await createAndTrackTicket(tracker, ctx.users.user.id, { assignedTo: ctx.users.agent.id });
      const privateComment = await createTestComment("Private", ticket.id, ctx.users.agent.id, true);
      const { token: otherAgentToken } = await createAndTrackUser(tracker, Role.AGENT);

      const { req, params } = createRouteRequest("DELETE", `http://localhost/api/comments/${privateComment.id}`, otherAgentToken, {
        id: privateComment.id,
      });

      const res = await DELETE(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
    });
  });
}