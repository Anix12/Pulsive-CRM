-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "sourceUniqueId" TEXT,
ADD COLUMN     "sourceMetadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenantId_sourceUniqueId_key" ON "Contact"("tenantId", "sourceUniqueId");
