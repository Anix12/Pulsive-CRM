-- CreateTable
CREATE TABLE "LeadList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadListMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadList_tenantId_idx" ON "LeadList"("tenantId");

-- CreateIndex
CREATE INDEX "LeadListMember_contactId_idx" ON "LeadListMember"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadListMember_listId_contactId_key" ON "LeadListMember"("listId", "contactId");

-- AddForeignKey
ALTER TABLE "LeadList" ADD CONSTRAINT "LeadList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "LeadList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
