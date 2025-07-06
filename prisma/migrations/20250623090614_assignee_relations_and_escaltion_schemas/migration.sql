-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedBy" TEXT,
ADD COLUMN     "escalatedTo" TEXT,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "isEscalated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TicketStatusLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "oldStatus" "TicketStatus",
    "newStatus" "TicketStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAssignmentLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "oldAssignee" TEXT,
    "newAssignee" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PrivateComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketStatusLog_ticketId_idx" ON "TicketStatusLog"("ticketId");

-- CreateIndex
CREATE INDEX "TicketStatusLog_userId_idx" ON "TicketStatusLog"("userId");

-- CreateIndex
CREATE INDEX "TicketStatusLog_createdAt_idx" ON "TicketStatusLog"("createdAt");

-- CreateIndex
CREATE INDEX "TicketAssignmentLog_ticketId_idx" ON "TicketAssignmentLog"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAssignmentLog_userId_idx" ON "TicketAssignmentLog"("userId");

-- CreateIndex
CREATE INDEX "TicketAssignmentLog_oldAssignee_idx" ON "TicketAssignmentLog"("oldAssignee");

-- CreateIndex
CREATE INDEX "TicketAssignmentLog_newAssignee_idx" ON "TicketAssignmentLog"("newAssignee");

-- CreateIndex
CREATE INDEX "TicketAssignmentLog_createdAt_idx" ON "TicketAssignmentLog"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_assignedTo_idx" ON "Ticket"("assignedTo");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- AddForeignKey
ALTER TABLE "TicketStatusLog" ADD CONSTRAINT "TicketStatusLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusLog" ADD CONSTRAINT "TicketStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_oldAssignee_fkey" FOREIGN KEY ("oldAssignee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_newAssignee_fkey" FOREIGN KEY ("newAssignee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateComment" ADD CONSTRAINT "PrivateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateComment" ADD CONSTRAINT "PrivateComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
