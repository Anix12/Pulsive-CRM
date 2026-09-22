-- AlterTable
ALTER TABLE "CallOutcome" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "engagementFormId" TEXT,
ADD COLUMN     "stage" TEXT;

-- CreateTable
CREATE TABLE "EngagementForm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EngagementForm_campaignId_key" ON "EngagementForm"("campaignId");

-- CreateIndex
CREATE INDEX "EngagementForm_tenantId_idx" ON "EngagementForm"("tenantId");

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_engagementFormId_fkey" FOREIGN KEY ("engagementFormId") REFERENCES "EngagementForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementForm" ADD CONSTRAINT "EngagementForm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementForm" ADD CONSTRAINT "EngagementForm_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
