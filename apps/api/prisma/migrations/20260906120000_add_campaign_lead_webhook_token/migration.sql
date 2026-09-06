-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "leadWebhookToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_leadWebhookToken_key" ON "Campaign"("leadWebhookToken");
