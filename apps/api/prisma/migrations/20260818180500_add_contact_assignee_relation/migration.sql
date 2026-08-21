-- Add a proper FK relation for Contact.assignedToId -> User.id so every lead
-- can be linked to the agent it's assigned to (or remain explicitly unassigned).

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Contact_tenantId_assignedToId_idx" ON "Contact"("tenantId", "assignedToId");
