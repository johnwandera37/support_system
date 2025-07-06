import prisma from "@/lib/db";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog, log } from "@/utils/logger";

async function cleanupTestUsers() {
  try {
    log("🔍 Fetching test users...");

    // Step 1: Find all test users (protected: false)
    const testUsers = await prisma.user.findMany({
      where: { protected: false },
      select: { id: true, email: true },
    });

    if (testUsers.length === 0) {
      log("✅ No test users found to delete.");
      return;
    }

    const userIds = testUsers.map((u) => u.id);
    const userEmails = testUsers.map((u) => u.email);

    log(`🧹 Found ${userIds.length} test users. Deleting their data...`);

    // Step 2: Find all tickets created by test users
    const tickets = await prisma.ticket.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });

    const ticketIds = tickets.map((t) => t.id);

    // Step 3: Delete related comments and tickets first
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
      prisma.privateComment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
      prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }),

      // Step 4: Delete users
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);

    log("✅ Cleanup complete.");
    log(`🗑 Deleted users: ${userEmails.join(", ")}`);
  } catch (error) {
    errLog("❌ Failed to clean up test users:", getErrorMessage(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestUsers();
