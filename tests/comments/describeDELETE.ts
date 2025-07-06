import prisma from "@/lib/db";
import {
  assignTicketToAgent,
  createRouteRequest,
  createTestComment,
  createTestTicket,
  createTestUserWithToken,
  escalateTicketToAdmin,
  TestContext,
} from "../testHelpers";
import { DELETE } from "@/app/api/comments/[id]/route";
import { Role } from "@/lib/generated/prisma/client";
import { authorizationRoleChecks } from "../authorizationsChecks";

export function describeDELETE(ctx: TestContext) {
   let commentId: string;
  
   type Tokens = {
    userToken: string;
    agentToken: string;
    adminToken: string
   }
   const tokens: Tokens = {} as Tokens

  describe.only("DELETE /api/comments/{id}", () => {
    // 👇 Only run this after ctx is ready
    beforeAll(async () => {
      // Initial user comment for the Seeded user in the ticket(ctx.ticket.id)
      const initialCommentForTheExistingTicket = await createTestComment(
        "Initial public comment",
        ctx.ticket.id,
        ctx.users.user.id,
        false
      );

      // set variables
      commentId = initialCommentForTheExistingTicket.id;
      Object.assign(tokens, ctx.tokens)
      
    });
     
    // ================================ < Authoization for all users > ================================
    // ✅ define tests only after setup is done
  // describe("Authorization checks", () => {
  //    console.log(tokens.adminToken);
  //     authorizationRoleChecks({
  //       method: "POST",
  //       url: `http://localhost/api/comments/${commentId}`,
  //       routeHandler: DELETE,
  //       rolesAllowed: ["USER", "AGENT", "ADMIN"],
  //       tokens: {
  //         userToken: tokens.userToken,
  //         agentToken: tokens.agentToken,
  //         adminToken: tokens.adminToken,
  //       },
  //       getBody: () => ({
  //         content: "Sample content",
  //         ticketId: commentId,
  //       }),
  //     });
  // })

    // ================================ < Allow deletion within 15 min> ================================

    // Assume there is a ticket where users, agents and admins are adding comments(ctx.ticket.id,)
    it("should allow all users to delete their own comments within time window", async () => {
      // Ensure ticket is assigned to the agent(important because they are
      // restricted to only add comments(private/public) to the tickets they are assigned to)
      await assignTicketToAgent(ctx.ticket.id, ctx.users.agent.email);

      // For admins to add private comments, the ticket must be escalated to that admin,
      await escalateTicketToAdmin(
        ctx.ticket.id,
        ctx.users.admin.email,
        ctx.users.agent.email
      );

      const userNewComment = await createTestComment(
        "User New comment",
        ctx.ticket.id,
        ctx.users.user.id,
        false
      );
      const agentNewComment = await createTestComment(
        "Agent New comment",
        ctx.ticket.id,
        ctx.users.agent.id,
        false
      );
      const agentNewPrivateComment = await createTestComment(
        "Agent New Private comment",
        ctx.ticket.id,
        ctx.users.agent.id,
        true
      );
      const adminNewComment = await createTestComment(
        "Admin New comment",
        ctx.ticket.id,
        ctx.users.admin.id,
        false
      );
      const adminNewPrivateComment = await createTestComment(
        "Admin New Private comment",
        ctx.ticket.id,
        ctx.users.admin.id,
        true
      );

      // Prepare delete requests using your helper
      const deleteRequests = [
        {
          label: "user public",
          token: ctx.tokens.userToken,
          comment: userNewComment,
          isPrivate: false,
        },
        {
          label: "agent public",
          token: ctx.tokens.agentToken,
          comment: agentNewComment,
          isPrivate: false,
        },
        {
          label: "agent private",
          token: ctx.tokens.agentToken,
          comment: agentNewPrivateComment,
          isPrivate: true,
        },
        {
          label: "admin public",
          token: ctx.tokens.adminToken,
          comment: adminNewComment,
          isPrivate: false,
        },
        {
          label: "admin private",
          token: ctx.tokens.adminToken,
          comment: adminNewPrivateComment,
          isPrivate: true,
        },
      ];

      // Run deletion and assertions for each case
      for (const { token, comment, label, isPrivate } of deleteRequests) {
        // console.log(token, comment, label, isPrivate);
        const { req, params } = createRouteRequest(
          "DELETE",
          `http://localhost/api/comments/${comment.id}`,
          token,
          { id: comment.id }
        );

        const res = await DELETE(req, { params: params });
        const data = await res.json();

        expect(res.status).toBe(200);
        // console.log(`${label}: ${res.status} → ${JSON.stringify(data)}`);
        expect(data.message).toBe("Comment deleted");

        const deletedComment = isPrivate
          ? await prisma.privateComment.findUnique({
              where: { id: comment.id },
            })
          : await prisma.comment.findUnique({ where: { id: comment.id } });

        // Verify soft delete
        expect(deletedComment?.deletedAt).toBeTruthy();
        expect(deletedComment?.content).toBe("[deleted by author]");
      }
    });

    // ================================ < Reject deletion after 15 min> ================================

    it("should reject all users' attempt to delete after 15-minute window", async () => {
      // Assign and escalate as required
      await assignTicketToAgent(ctx.ticket.id, ctx.users.agent.email);
      await escalateTicketToAdmin(
        ctx.ticket.id,
        ctx.users.admin.email,
        ctx.users.agent.email
      );

      const expiredTime = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago

      const userOldComment = await createTestComment(
        "User Old comment",
        ctx.ticket.id,
        ctx.users.user.id,
        false,
        { createdAt: expiredTime }
      );

      const agentOldComment = await createTestComment(
        "Agent Old comment",
        ctx.ticket.id,
        ctx.users.agent.id,
        false,
        { createdAt: expiredTime }
      );

      const agentOldPrivateComment = await createTestComment(
        "Agent Old Private comment",
        ctx.ticket.id,
        ctx.users.agent.id,
        true,
        { createdAt: expiredTime }
      );

      const adminOldComment = await createTestComment(
        "Admin Old comment",
        ctx.ticket.id,
        ctx.users.admin.id,
        false,
        { createdAt: expiredTime }
      );

      const adminOldPrivateComment = await createTestComment(
        "Admin Old Private comment",
        ctx.ticket.id,
        ctx.users.admin.id,
        true,
        { createdAt: expiredTime }
      );

      const deleteRequests = [
        {
          label: "user public",
          token: ctx.tokens.userToken,
          comment: userOldComment,
        },
        {
          label: "agent public",
          token: ctx.tokens.agentToken,
          comment: agentOldComment,
        },
        {
          label: "agent private",
          token: ctx.tokens.agentToken,
          comment: agentOldPrivateComment,
        },
        {
          label: "admin public",
          token: ctx.tokens.adminToken,
          comment: adminOldComment,
        },
        {
          label: "admin private",
          token: ctx.tokens.adminToken,
          comment: adminOldPrivateComment,
        },
      ];

      for (const { token, comment, label } of deleteRequests) {
        const { req, params } = createRouteRequest(
          "DELETE",
          `http://localhost/api/comments/${comment.id}`,
          token,
          { id: comment.id }
        );

        const res = await DELETE(req, { params });
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.error).toMatch(/within 15 minutes/i);
      }
    });

    // Add more DELETE tests as needed
  });
}

//   it("should reject deletion of someone else’s comment", async () => {
//     const { user: anotherUser } = await createTestUserWithToken(Role.USER);

//     const comment = await createTestComment(
//       "Not yours",
//       ctx.ticket.id,
//       anotherUser.id,
//       false
//     );

//     const { req, params } = createRouteRequest(
//       "DELETE",
//       `http://localhost/api/comments/${comment.id}`,
//       ctx.tokens.userToken,
//       { id: comment.id }
//     );

//     const res = await DELETE(req, { params });
//     const data = await res.json();

//     expect(res.status).toBe(403);
//     expect(data.error).toMatch(/your own comments/i);
//   });

//   it("should reject deletion of private comment by unassigned agent", async () => {
//     const { user: anotherAgent, token } = await createTestUserWithToken(
//       Role.AGENT
//     );

//     const privateComment = await createTestComment(
//       "Private",
//       ctx.ticket.id,
//       anotherAgent.id,
//       true
//     );

//     const { req, params } = createRouteRequest(
//       "DELETE",
//       `http://localhost/api/comments/${privateComment.id}`,
//       token,
//       { id: privateComment.id }
//     );

//     const res = await DELETE(req, { params });
//     const data = await res.json();

//     expect(res.status).toBe(403);
//     expect(data.error).toMatch(/assigned agent/i);
//   });

//   it("should reject deletion if ticket is escalated to a different admin", async () => {
//     const { user: adminA, token: tokenA } = await createTestUserWithToken(
//       Role.ADMIN
//     );

//     const escalatedTicket = await createTestTicket(ctx.users.user.id, {
//       title: "Escalated Ticket",
//       description: "Needs escalation",
//       priority: "HIGH",
//       status: "OPEN",
//       isEscalated: true,
//       escalatedTo: ctx.users.admin.id, // Escalated to another admin
//     });

//     const privateComment = await createTestComment(
//       "Private for escalated",
//       escalatedTicket.id,
//       adminA.id,
//       true
//     );

//     const { req, params } = createRouteRequest(
//       "DELETE",
//       `http://localhost/api/comments/${privateComment.id}`,
//       tokenA,
//       { id: privateComment.id }
//     );

//     const res = await DELETE(req, { params });
//     const data = await res.json();

//     expect(res.status).toBe(403);
//     expect(data.error).toMatch(/escalated to/i);
//   });

//   it("should allow assigned agent to delete private comment", async () => {
//     const ticket = await createTestTicket(ctx.users.user.id, {
//       title: "Agent Ticket",
//       status: "OPEN",
//       assignedTo: ctx.users.agent.id,
//     });

//     const privateComment = await createTestComment(
//       "Private by agent",
//       ticket.id,
//       ctx.users.agent.id,
//       true
//     );

//     const { req, params } = createRouteRequest(
//       "DELETE",
//       `http://localhost/api/comments/${privateComment.id}`,
//       ctx.tokens.agentToken,
//       { id: privateComment.id }
//     );

//     const res = await DELETE(req, { params });
//     const data = await res.json();

//     expect(res.status).toBe(200);
//     expect(data.message).toBe("Comment deleted");
//   });
// });
