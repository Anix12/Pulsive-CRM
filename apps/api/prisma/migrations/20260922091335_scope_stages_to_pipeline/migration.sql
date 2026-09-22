-- Backfill: ensure every tenant that already has DealStage rows also has a
-- default Pipeline, then attach any pipeline-less stages to it. This has to
-- run before the unique constraint below, since stage ordering moves from
-- being tenant-wide unique to being unique per pipeline.
INSERT INTO "Pipeline" (id, "tenantId", name, "isDefault", "createdAt", "updatedAt")
SELECT 'p' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
       t."tenantId", 'Sales Pipeline', true, now(), now()
FROM (SELECT DISTINCT "tenantId" FROM "DealStage" WHERE "pipelineId" IS NULL) t
WHERE NOT EXISTS (
  SELECT 1 FROM "Pipeline" p WHERE p."tenantId" = t."tenantId"
);

UPDATE "DealStage" ds
SET "pipelineId" = p.id
FROM "Pipeline" p
WHERE ds."pipelineId" IS NULL
  AND p."tenantId" = ds."tenantId"
  AND p."isDefault" = true;

-- Re-scope stage-order uniqueness from tenant-wide to per-pipeline, so two
-- different pipelines can each have their own "order 1, 2, 3…" stage list.
DROP INDEX "DealStage_tenantId_order_key";
CREATE UNIQUE INDEX "DealStage_tenantId_pipelineId_order_key" ON "DealStage"("tenantId", "pipelineId", "order");
