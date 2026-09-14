// admin/action.ts sends real notification emails via @/services/nodemailer.
// Without mocking this, every test that hits approve/promote/demote makes a
// genuine SMTP connection attempt — slow, network-dependent, and exactly
// what caused the 5000ms timeouts. Mock it so the route's own logic runs
// instantly and deterministically, with no external dependency at all.
jest.mock("@/services/nodemailer", () => ({
  transporter: {
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-message-id" }),
  },
}));

import { POST } from "@/app/api/admin/action/route";
import { transporter } from "@/services/nodemailer";
import {
  createAndTrackUser,
  createRouteRequest,
  TestContext,
  createTestTracker,
} from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";
import { Role } from "@/lib/generated/prisma/client";
import prisma from "@/lib/db";

const mockedSendMail = transporter.sendMail as jest.Mock;

export default function describeAction(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
  const doAction = async (token: string, body: any) => {
    const { req } = createRouteRequest("POST", "http://localhost/api/admin/action", token, undefined, body);
    const res = await POST(req);
    const data = await res.json();
    return { res, data };
  };

  describe("POST /api/admin/action", () => {
    beforeEach(() => {
      mockedSendMail.mockClear();
      mockedSendMail.mockResolvedValue({ messageId: "mock-message-id" }); // reset to success default after any test overrides it
    });

    authorizationRoleChecks({
      method: "POST",
      url: "http://localhost/api/admin/action",
      routeHandler: POST,
      rolesAllowed: ["ADMIN"],
      getTokens: () => ctx.tokens,
      getBody: () => ({ action: "promote", userId: "not-a-real-user-id" }),
    });

    it("should reject an admin attempting to act on their own account", async () => {
      const { res, data } = await doAction(ctx.tokens.adminToken, {
        action: "demote",
        userId: ctx.users.admin.id,
        targetRole: "AGENT",
      });
      expect(res.status).toBe(403);
      expect(data.error).toBe("You cannot approve, promote, or demote yourself.");
    });

    it("should promote a USER to ADMIN and create their admin profile", async () => {
      const { user: target } = await createAndTrackUser(tracker, Role.USER);
      const { res, data } = await doAction(ctx.tokens.adminToken, { action: "promote", userId: target.id });

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const updated = await prisma.user.findUnique({ where: { id: target.id }, include: { adminProfile: true } });
      expect(updated?.role).toBe("ADMIN");
      expect(updated?.adminProfile).not.toBeNull();
      expect(mockedSendMail).toHaveBeenCalledTimes(1);
    });

    it("should demote an ADMIN to USER and remove their admin profile", async () => {
      const { user: target } = await createAndTrackUser(tracker, Role.USER);
      await doAction(ctx.tokens.adminToken, { action: "promote", userId: target.id }); // set up: make them admin first
      mockedSendMail.mockClear(); // ignore the promote-step's own send, only care about the demote

      const { res } = await doAction(ctx.tokens.adminToken, {
        action: "demote",
        userId: target.id,
        targetRole: "USER",
      });

      expect(res.status).toBe(200);

      const updated = await prisma.user.findUnique({ where: { id: target.id }, include: { adminProfile: true } });
      expect(updated?.role).toBe("USER");
      expect(updated?.adminProfile).toBeNull();
      expect(updated?.isApproved).toBe(false);
      expect(mockedSendMail).toHaveBeenCalledTimes(1);
    });

    it("should approve a pending agent request and create their agent profile", async () => {
      const { user: target } = await createAndTrackUser(tracker, Role.USER);
      await prisma.user.update({ where: { id: target.id }, data: { wantsToBeAgent: true } });

      const { res, data } = await doAction(ctx.tokens.adminToken, { action: "approve", userId: target.id, department: "Support" });

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const updated = await prisma.user.findUnique({ where: { id: target.id }, include: { agentProfile: true } });
      expect(updated?.role).toBe("AGENT");
      expect(updated?.isApproved).toBe(true);
      expect(updated?.agentProfile?.department).toBe("Support");
    });

    it("should reject an invalid action value", async () => {
      const { res, data } = await doAction(ctx.tokens.adminToken, { action: "not-a-real-action", userId: ctx.users.user.id });
      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error.action");
    });

    // ---- Confirms the email-failure branch we built earlier still works ----
    it("should still complete the action successfully if the notification email fails to send", async () => {
      mockedSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));
      const { user: target } = await createAndTrackUser(tracker, Role.USER);

      const { res, data } = await doAction(ctx.tokens.adminToken, { action: "promote", userId: target.id });

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("notification email failed to send");

      const updated = await prisma.user.findUnique({ where: { id: target.id } });
      expect(updated?.role).toBe("ADMIN"); // the actual state change still happened
    });
  });
}