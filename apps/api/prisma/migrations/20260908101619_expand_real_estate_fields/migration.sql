-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('TOKEN_RECEIVED', 'BOOKED', 'AGREEMENT_DONE', 'REGISTERED', 'CANCELLED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'TOKEN_RECEIVED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('UPCOMING', 'UNDER_CONSTRUCTION', 'READY', 'COMPLETED');
ALTER TABLE "public"."Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'UPCOMING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SiteVisitStatus" ADD VALUE 'ON_THE_WAY';
ALTER TYPE "SiteVisitStatus" ADD VALUE 'AT_SITE';
ALTER TYPE "SiteVisitStatus" ADD VALUE 'VISITING';
ALTER TYPE "SiteVisitStatus" ADD VALUE 'VISIT_DONE';
ALTER TYPE "SiteVisitStatus" ADD VALUE 'RETURNING';

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "paymentStage",
ADD COLUMN     "brokerageAmount" DECIMAL(15,2),
ADD COLUMN     "brokeragePercent" DECIMAL(5,2),
ADD COLUMN     "brokerageReceived" DECIMAL(15,2) NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'TOKEN_RECEIVED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "geofenceMeters" INTEGER DEFAULT 200,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ALTER COLUMN "status" SET DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "interestLevel" "InterestLevel",
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "statusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "travelMinutes" INTEGER,
ADD COLUMN     "visitMinutes" INTEGER;

