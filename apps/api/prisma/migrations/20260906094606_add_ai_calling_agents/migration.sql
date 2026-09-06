-- CreateEnum
CREATE TYPE "AiAgentStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "aiAgentId" TEXT,
ADD COLUMN     "aiSuccessEvaluation" BOOLEAN,
ADD COLUMN     "aiSummary" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "vapiApiKey" TEXT,
ADD COLUMN     "vapiPhoneNumberId" TEXT;

-- CreateTable
CREATE TABLE "AiCallAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "category" TEXT NOT NULL DEFAULT 'General',
    "greeting" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "voiceId" TEXT,
    "vapiAssistantId" TEXT,
    "status" "AiAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCallAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCallAgent_tenantId_idx" ON "AiCallAgent"("tenantId");

-- CreateIndex
CREATE INDEX "Call_tenantId_aiAgentId_idx" ON "Call"("tenantId", "aiAgentId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "AiCallAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCallAgent" ADD CONSTRAINT "AiCallAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
