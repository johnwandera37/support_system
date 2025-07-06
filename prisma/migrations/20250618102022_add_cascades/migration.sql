-- DropForeignKey
ALTER TABLE "AdminProfile" DROP CONSTRAINT "AdminProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "AgentProfile" DROP CONSTRAINT "AgentProfile_userId_fkey";

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
