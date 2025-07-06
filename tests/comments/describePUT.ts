import prisma from "@/lib/db";
import { createRouteRequest, createTestComment, expectZodErrorOnField, TestContext } from "../testHelpers";
import { PUT } from "@/app/api/comments/[id]/route";
import { createTestUserWithToken, createTestTicket } from "../testHelpers";
import { Role } from "@/lib/generated/prisma/client";

export default function describePUT(ctx: TestContext) {

  describe("PUT /api/comments/{id}", () => {
    it("should allow user to update their own public comment within time window", async () => {
      // Initial user comment for the Seeded user in the ticket(ctx.ticket.id) 
       const initialCommentForTheExistingTicket = await createTestComment("Initial public comment", ctx.ticket.id, ctx.users.user.id, false)
      const { req, params } = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${initialCommentForTheExistingTicket.id}`,
        ctx.tokens.userToken,
        { id: initialCommentForTheExistingTicket.id }, // params
        {
          content: "Updated public comment", // body
        }
      );

      const res = await PUT( req, { params });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.content).toBe("Updated public comment");
      expect(data.editedAt).toBeTruthy();
    });

    it("should reject updates after 15 minutes", async () => {
      // Create a new comment with old timestamp
      const oldComment = await prisma.comment.create({
        data: {
          content: "Old comment",
          ticketId: ctx.ticket.id,
          userId: ctx.users.user.id, // Use context user
          createdAt: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago
        },
      });

      const {req, params} = createRouteRequest(
        "PUT",
        `http://localhost/api/comments/${oldComment.id}`,
        ctx.tokens.userToken,
        {id: oldComment.id},
        {
          content: "Attempt to update old comment",
        }
      );

      const res = await PUT(req, { params });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain("within 15 minutes");

      // Clean up
      await prisma.comment.delete({ where: { id: oldComment.id } });
    });

    // Add more PUT tests as needed
  });

  }




  // describe("PUT /api/comments/{id}", () => {
  //   it("should allow user to update their own public comment within time window", async () => {
  //     const { req, params } = createRouteRequest(
  //       "PUT",
  //       `http://localhost/api/comments/${ctx.comments.public.id}`,
  //       ctx.tokens.userToken,
  //       { id: ctx.comments.public.id },
  //       {
  //         content: "Updated public comment",
  //       }
  //     );

  //     const res = await PUT(req, { params });
  //     const data = await res.json();

  //     expect(res.status).toBe(200);
  //     expect(data.content).toBe("Updated public comment");
  //     expect(data.editedAt).toBeTruthy();
  //   });

  //   it("should reject updates after 15 minutes", async () => {
  //     const oldComment = await prisma.comment.create({
  //       data: {
  //         content: "Old comment",
  //         ticketId: ctx.ticket.id,
  //         userId: ctx.users.user.id,
  //         createdAt: new Date(Date.now() - 16 * 60 * 1000),
  //       },
  //     });

  //     const { req, params } = createRouteRequest(
  //       "PUT",
  //       `http://localhost/api/comments/${oldComment.id}`,
  //       ctx.tokens.userToken,
  //       { id: oldComment.id },
  //       {
  //         content: "Attempt to update old comment",
  //       }
  //     );

  //     const res = await PUT(req, { params });
  //     const data = await res.json();

  //     expect(res.status).toBe(403);
  //     expect(data.error).toMatch(/within 15 minutes/i);

  //     await prisma.comment.delete({ where: { id: oldComment.id } });
  //   });

  //   it("should reject invalid request body", async () => {
  //     const { req, params } = createRouteRequest(
  //       "PUT",
  //       `http://localhost/api/comments/${ctx.comments.public.id}`,
  //       ctx.tokens.userToken,
  //       { id: ctx.comments.public.id },
  //       {} // No content
  //     );

  //     const res = await PUT(req, { params });
  //     const data = await res.json();

  //     expect(res.status).toBe(400);
  //     expect(expectZodErrorOnField(data, "content", /expected string/i));
  //   });

  //   it("should reject user updating someone else's comment", async () => {
  //     const { user: otherUser } = await createTestUserWithToken(Role.USER);
  //     const otherComment = await prisma.comment.create({
  //       data: {
  //         content: "Other user comment",
  //         ticketId: ctx.ticket.id,
  //         userId: otherUser.id,
  //       },
  //     });

  //     const { req, params } = createRouteRequest(
  //       "PUT",
  //       `http://localhost/api/comments/${otherComment.id}`,
  //       ctx.tokens.userToken,
  //       { id: otherComment.id },
  //       {
  //         content: "Malicious update attempt",
  //       }
  //     );

  //     const res = await PUT(req, { params });
  //     const data = await res.json();

  //     expect(res.status).toBe(403);
  //     expect(data.error).toMatch(/only modify your own comments/i);

  //     await prisma.comment.delete({ where: { id: otherComment.id } });
  //   });

  //   it("should reject updates on closed ticket", async () => {
  //     const closedTicket = await createTestTicket(ctx.users.user.id, {
  //       status: "CLOSED",
  //     });

  //     const closedComment = await prisma.comment.create({
  //       data: {
  //         content: "Comment on closed ticket",
  //         ticketId: closedTicket.id,
  //         userId: ctx.users.user.id,
  //       },
  //     });

  //     const { req, params } = createRouteRequest(
  //       "PUT",
  //       `http://localhost/api/comments/${closedComment.id}`,
  //       ctx.tokens.userToken,
  //       { id: closedComment.id },
  //       {
  //         content: "Trying to update on closed ticket",
  //       }
  //     );

  //     const res = await PUT(req, { params });
  //     const data = await res.json();

  //     expect(res.status).toBe(403);
  //     expect(data.error).toMatch(/closed tickets/i);

  //     await prisma.comment.delete({ where: { id: closedComment.id } });
  //     await prisma.ticket.delete({ where: { id: closedTicket.id } });
  //   });
  // });
