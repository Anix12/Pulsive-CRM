-- CreateEnum
CREATE TYPE "CampaignPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CampaignDuplicateCheck" AS ENUM ('NONE', 'MOBILE_ONLY', 'EMAIL_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "CampaignAssignmentRule" AS ENUM ('MANUAL', 'ROUND_ROBIN');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "assignmentRule" "CampaignAssignmentRule" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "duplicateCheck" "CampaignDuplicateCheck" NOT NULL DEFAULT 'MOBILE_ONLY',
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pipelineId" TEXT,
ADD COLUMN     "priority" "CampaignPriority" NOT NULL DEFAULT 'MEDIUM';

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
