// app/api/admin/actions/route.ts
// This API is responsible for approving, promoting or demoting actions

import prisma from "@/lib/db";
import { transporter } from "@/services/nodemailer";
import { endpoints, ORG_SUPPORT_EMAIL } from "@/config/constants";
import { Prisma } from "@/lib/generated/prisma/client";
import { authorize } from "@/lib/auth";
import { logError } from "@/lib/server/logger";
import { badRequestFromZod, nextErrorResponse, nextInfoResponse, nextWarnResponse } from "@/utils/responseUtils";
import { adminActionSchema } from "@/lib/zodSchema";

const ROUTE = endpoints.adminAction;

async function sendNotificationEmail(
  email: string,
  subject: string,
  text: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: ORG_SUPPORT_EMAIL,
      to: email,
      subject,
      text,
    });
    return true;
  } catch (error) {
    // Is there a retry mechanism, or what happens if email not sent but agent has been updated successfully?
    logError(
      {
        route: ROUTE,
        status: 502,
        message: "Failed to send admin action notification email",
        detail: `to=${email} subject="${subject}"`,
      },
      error
    );
    return false;
  }
}

export async function POST(req: Request) {
  const auth = await authorize(["ADMIN"])(req, ROUTE); //Ensure its admin who can access this action

  // If not authorized, `auth` will be a NextResponse with error
  if (!("authorized" in auth)) return auth;

  // Optional: Access current user's data
  const currentUser = auth.user;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return nextWarnResponse("Request body must be valid JSON", 400, { route: ROUTE });
  }

   const parsed = adminActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequestFromZod(parsed.error, 400, { route: ROUTE });
  }

  // Continue with role management logic
  const { action, userId, department, targetRole } = parsed.data;

  // Prevent admin self-approval, promotion, or demotion
  if (currentUser.id === userId) {
    return nextWarnResponse("You cannot approve, promote, or demote yourself.", 403, {
      route: ROUTE,
      meta: { userId, action },
    });
  }

  let emailSent = true;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return nextWarnResponse("User not found", 404, { route: ROUTE, meta: { userId } });
    }

    // APROVE
    if (action === "approve") {
      if (!user.wantsToBeAgent || user.isApproved) {
        return nextWarnResponse("User is not pending approval", 400, { route: ROUTE, meta: { userId } });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true, role: "AGENT" },
      });

      // Create agent profile with optional department
      await prisma.agentProfile.create({
        data: {
          userId: userId,
          department: department || null,
        },
      });

      emailSent = await sendNotificationEmail(
        user.email,
        "Agent Application Approved",
        `Hi ${user.name}, your agent application has been approved.`
      );
    }

    // PROMOTE
    if (action === "promote") {
      if (user.role === "ADMIN") {
        return nextWarnResponse("User is already an admin", 400, { route: ROUTE, meta: { userId } });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: "ADMIN" },
      });

      await prisma.adminProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      // Delete agent profile only if the user was approved
      if (user.isApproved) {
        await prisma.agentProfile.delete({ where: { userId } });
      }

      //also change wantToBeAgent and isApproved to false
      if (user.isApproved && user.wantsToBeAgent) {
        await prisma.user.update({
          where: { id: userId },
          data: { isApproved: false, wantsToBeAgent: false },
        });
      }

      emailSent = await sendNotificationEmail(
        updated.email,
        "You are now an Admin",
        `Hi ${updated.name}, you have been promoted to Admin.`
      );
    }

    // DEMOTE
    if (action === "demote") {
      if (user.role !== "ADMIN" && user.role !== "AGENT") {
        return nextWarnResponse("User is not an admin or agent", 400, { route: ROUTE, meta: { userId } });
      }

      if (!targetRole) {
        return nextWarnResponse("Invalid or missing targetRole", 400, { route: ROUTE, meta: { userId } });
      }

      if (user.role === "AGENT" && targetRole === "AGENT") {
        return nextWarnResponse("User is already an agent", 400, { route: ROUTE, meta: { userId } });
      }

      // Transition logic
      const role = targetRole // safe: already validated above from zod
      const updates: Prisma.UserUpdateInput = { role };

      // If moving to USER, remove agent/admin profile
      if (targetRole === "USER") {
        //when user is promoted to Admin, isApproved and wantsToBeAgent becomes false, the following simply emphasizes
        updates.isApproved = false;
        updates.wantsToBeAgent = false;

        if (user.role === "ADMIN") {
          await prisma.adminProfile.delete({ where: { userId } });
        } else if (user.role === "AGENT") {
          await prisma.agentProfile.delete({ where: { userId } });
        }
      } else if (targetRole === "AGENT") {
        // Admin → Agent
        if (user.role === "ADMIN") {
          await prisma.adminProfile.delete({ where: { userId } });

          // Create agent profile (with default or null department)
          await prisma.agentProfile.create({
            data: {
              userId,
            },
          });

          // The following flags needs to be true for user to be an agent
          updates.isApproved = true;
          updates.wantsToBeAgent = true;
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updates,
      });

      const subject = `Role Updated`;
      const bodyMessage = `Hi ${updated.name
        }, your role has been changed to ${targetRole.toLowerCase()}.`;

      emailSent = await sendNotificationEmail(user.email, subject, bodyMessage);
    }

    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    const message = emailSent
      ? `${actionLabel} action completed successfully.`
      : `${actionLabel} action completed successfully, but the notification email failed to send.`;

    return nextInfoResponse(message, 200, {
      route: ROUTE,
      meta: { userId, action, emailSent },
    });
  } catch (error) {
    return nextErrorResponse(error, 500, {
      route: ROUTE,
      message: `${action} action failed`,
    });
  }
}
