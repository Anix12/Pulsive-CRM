-- Adds a provider-side identifier (e.g. a Facebook Page ID) to Integration so
-- a single global webhook can route an inbound event to the right tenant,
-- instead of needing a distinct per-tenant callback URL for providers whose
-- webhook config is registered once at the app level (e.g. Meta).

ALTER TABLE "Integration" ADD COLUMN "externalId" TEXT;

CREATE INDEX "Integration_type_externalId_idx" ON "Integration"("type", "externalId");
