import { POST } from "@/app/api/comments/route";
import {
  assignTicketToAgent,
  createRouteRequest,
  createTestTicket,
  createTestUserWithToken,
  expectZodErrorOnField,
  TestContext,
} from "../testHelpers";
import prisma from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { authorizationRoleChecks } from "../authorizationsChecks";
import { signToken } from "@/lib/jwt";

export default function describePOST(ctx: TestContext) {
  describe("POST /api/comments", () => {
    // // Authoization
    // authorizationRoleChecks({
    //   method: "POST",
    //   url: "http://localhost/api/comments",
    //   routeHandler: POST,
    //   rolesAllowed: ["USER", "AGENT", "ADMIN"],
    //   tokens: {
    //     userToken: ctx.tokens?.userToken,
    //     agentToken: ctx.tokens?.agentToken,
    //     adminToken: ctx.tokens?.adminToken,
    //   },
    //   getBody: () => ({
    //     content: "Sample content",
    //     ticketId: ctx.ticket.id,
    //   }),
    // });

    //  Validation & bad input
    it("should reject request with invalid schema (missing content)", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined, // no params
        {
          ticketId: ctx.ticket.id,
          // missing content
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(expectZodErrorOnField(data, "content", /expected string/i));
    });

    it("should reject request with missing ticketId", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined,
        {
          content: "Missing ticketId",
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(expectZodErrorOnField(data, "ticketId", /expected string/i));
    });

    // Comment creations
    it("should allow user to create public comment on their own ticket", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined, // No params
        {
          content: "User public comment",
          ticketId: ctx.ticket.id,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.content).toBe("User public comment");
      expect(data.ticketId).toBe(ctx.ticket.id);
    });

    it("should allow agent to create public comment on assigned ticket", async () => {
      // Assign ticket using helper to user(agent)
      await assignTicketToAgent(ctx.ticket.id, ctx.users.agent.email);

      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.agentToken,
        undefined, // No params
        {
          content: "Agent public comment",
          ticketId: ctx.ticket.id,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Agent public comment");
    });

    it("should allow agent to create private comment on assigned ticket", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.agentToken,
        undefined, // No params
        {
          content: "Agent private comment",
          ticketId: ctx.ticket.id,
          isPrivate: true,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Agent private comment");
    });

    it("should allow admin to create any type of comment", async () => {
      const { req: publicReq } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.adminToken,
        undefined, // No params
        {
          content: "Admin public comment",
          ticketId: ctx.ticket.id,
        }
      );

      const { req: privateReq } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.adminToken,
        undefined, // No params
        {
          content: "Admin private comment",
          ticketId: ctx.ticket.id,
          isPrivate: true,
        }
      );

      const [publicRes, privateRes] = await Promise.all([
        POST(publicReq),
        POST(privateReq),
      ]);

      expect(publicRes.status).toBe(201);
      expect(privateRes.status).toBe(201);
    });

    it("should reject user creating private comments", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined, // No params
        {
          content: "User private attempt",
          ticketId: ctx.ticket.id,
          isPrivate: true,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe("Users cannot create private comments");
    });

    it("should reject user commenting on another user's ticket", async () => {
      const otherTicket = await createTestTicket(ctx.users.agent.id);

      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined,
        {
          content: "Cross ticket comment",
          ticketId: otherTicket.id,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("only comment on your own tickets");
    });

    it("should reject agent creating public comment on unassigned ticket", async () => {
      // Make sure ticket is unassigned
      await prisma.ticket.update({
        where: { id: ctx.ticket.id },
        data: { assignedTo: null },
      });

      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.agentToken,
        undefined,
        {
          content: "Public comment attempt",
          ticketId: ctx.ticket.id,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("not assigned");
    });

    it("should reject agent creating private comments on unassigned tickets", async () => {
      // Ensure ticket is unassigned
      await prisma.ticket.update({
        where: { id: ctx.ticket.id },
        data: { assignedTo: null },
      });

      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.agentToken,
        undefined, // No params
        {
          content: "Agent private attempt",
          ticketId: ctx.ticket.id,
          isPrivate: true,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain(
        "can only add private comments to their assigned tickets"
      );
    });

    // Invalid tickets ids and closed tickets
    it("should reject invalid ticket IDs", async () => {
      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined, // No params
        {
          content: "Invalid ticket",
          ticketId: "invalid-id",
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Ticket not found");
    });

    it("should reject comments on closed tickets", async () => {
      // Close the ticket
      await prisma.ticket.update({
        where: { id: ctx.ticket.id },
        data: { status: "CLOSED" },
      });

      const { req } = createRouteRequest(
        "POST",
        "http://localhost/api/comments",
        ctx.tokens.userToken,
        undefined, // No params
        {
          content: "Comment on closed ticket",
          ticketId: ctx.ticket.id,
        }
      );

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("closed hence comments are not allowed");

      // Reopen ticket for other tests
      await prisma.ticket.update({
        where: { id: ctx.ticket.id },
        data: { status: "OPEN" },
      });
    });
  });
}
