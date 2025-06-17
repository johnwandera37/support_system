// app/api/admin/actions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { transporter } from "@/services/nodemailer";
import { errLog } from "@/utils/logger";
import { authorize } from "@/middleware/authorize";
import { ORG_SUPPORT_EMAIL } from "@/config/constants";

async function sendNotificationEmail(
  email: string,
  subject: string,
  text: string
) {
  try {
    await transporter.sendMail({
      from: ORG_SUPPORT_EMAIL,
      to: email,
      subject,
      text,
    });
  } catch (error) {
    errLog("📧Failed to send email:", error);
  }
}

export async function POST(req: Request) {
  const auth = await authorize(["ADMIN"])(req); //Ensure its admin who can access this action

  // If not authorized, `auth` will be a NextResponse with error
  if (!("authorized" in auth)) return auth;

  // Optional: Access current user's data
  const currentUser = auth.user;

  // Continue with role management logic
  const { action, userId, department, targetRole } = await req.json();

  // Prevent admin self-approval, promotion, or demotion
  if (currentUser.id === userId) {
    return NextResponse.json(
      { error: "You cannot approve, promote, or demote yourself." },
      { status: 403 }
    );
  }

  if (!userId || !["promote", "demote", "approve"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // APROVE
    if (action === "approve") {
      if (!user.wantsToBeAgent || user.isApproved) {
        return NextResponse.json(
          { error: "User is not pending approval" },
          { status: 400 }
        );
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

      await sendNotificationEmail(
        user.email,
        "Agent Application Approved",
        `Hi ${user.name}, your agent application has been approved.`
      );
    }

    // PROMOTE
    if (action === "promote") {
      if (user.role === "ADMIN") {
        return NextResponse.json(
          { error: "User is already an admin" },
          { status: 400 }
        );
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
      if(user.isApproved && user.wantsToBeAgent){
        await prisma.user.update({
        where: { id: userId },
        data: { isApproved: false, wantsToBeAgent: false },
      });
      }

      await sendNotificationEmail(
        updated.email,
        "You are now an Admin",
        `Hi ${updated.name}, you have been promoted to Admin.`
      );
    }

    // DEMOTE
    if (action === "demote") {
      if (user.role !== "ADMIN" && user.role !== "AGENT") {
        return NextResponse.json(
          { error: "User is not an admin or agent" },
          { status: 400 }
        );
      }

      if (!targetRole || !["AGENT", "USER"].includes(targetRole)) {
        return NextResponse.json(
          { error: "Invalid or missing targetRole" },
          { status: 400 }
        );
      }

      if (user.role === "AGENT" && targetRole === "AGENT") {
        return NextResponse.json(
          { error: "User is already an agent" },
          { status: 400 }
        );
      }

      // Transition logic
      const updates: any = { role: targetRole };

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
      const bodyMessage = `Hi ${
        updated.name
      }, your role has been changed to ${targetRole.toLowerCase()}.`;

      await sendNotificationEmail(user.email, subject, bodyMessage);
    }

    return NextResponse.json({
      message: `${
        action.charAt(0).toUpperCase() + action.slice(1)
      } action completed successfully.`,
    }, { status: 200 });
  } catch (error) {
    errLog(`Action ${action} failed`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
