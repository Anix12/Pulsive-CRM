-- Merge Contact.firstName + Contact.lastName into a single Contact.name column,
-- and add an alternatePhone field.

ALTER TABLE "Contact" ADD COLUMN "name" TEXT;
ALTER TABLE "Contact" ADD COLUMN "alternatePhone" TEXT;

UPDATE "Contact"
SET "name" = TRIM(CONCAT(COALESCE("firstName", ''), ' ', COALESCE("lastName", '')));

ALTER TABLE "Contact" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "Contact" DROP COLUMN "firstName";
ALTER TABLE "Contact" DROP COLUMN "lastName";
