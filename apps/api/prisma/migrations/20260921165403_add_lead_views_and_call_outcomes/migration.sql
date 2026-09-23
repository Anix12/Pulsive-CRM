-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "answeredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LeadView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "filters" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallOutcome" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL,
    "reason" TEXT,
    "remark" TEXT,
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadView_tenantId_idx" ON "LeadView"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CallOutcome_callId_key" ON "CallOutcome"("callId");

-- CreateIndex
CREATE INDEX "CallOutcome_tenantId_contactId_idx" ON "CallOutcome"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "CallOutcome_tenantId_agentId_idx" ON "CallOutcome"("tenantId", "agentId");

-- AddForeignKey
ALTER TABLE "LeadView" ADD CONSTRAINT "LeadView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;
