-- CreateEnum
CREATE TYPE "RealEstateLeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPERTY_SHARED', 'VISIT_SCHEDULED', 'VISIT_DONE', 'NEGOTIATION', 'BOOKING', 'CLOSED_WON', 'CLOSED_LOST');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "realEstateStage" "RealEstateLeadStage";

-- CreateTable
CREATE TABLE "RealEstateStageHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fromStage" "RealEstateLeadStage",
    "toStage" "RealEstateLeadStage" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT NOT NULL,

    CONSTRAINT "RealEstateStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealEstateStageHistory_tenantId_idx" ON "RealEstateStageHistory"("tenantId");

-- CreateIndex
CREATE INDEX "RealEstateStageHistory_tenantId_contactId_idx" ON "RealEstateStageHistory"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_realEstateStage_idx" ON "Contact"("tenantId", "realEstateStage");

-- AddForeignKey
ALTER TABLE "RealEstateStageHistory" ADD CONSTRAINT "RealEstateStageHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateStageHistory" ADD CONSTRAINT "RealEstateStageHistory_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
