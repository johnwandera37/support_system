-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wantsToBeAgent" BOOLEAN NOT NULL DEFAULT false;
