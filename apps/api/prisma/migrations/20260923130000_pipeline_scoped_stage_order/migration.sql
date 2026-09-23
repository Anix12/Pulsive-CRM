/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,pipelineId,order]` on the table `DealStage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,order]` on the table `DealStage` will be dropped (superseded by the constraint above), so stage order can be scoped per pipeline instead of tenant-wide.

*/
-- DropIndex
DROP INDEX "DealStage_tenantId_order_key";

-- CreateIndex
CREATE UNIQUE INDEX "DealStage_tenantId_pipelineId_order_key" ON "DealStage"("tenantId", "pipelineId", "order");
