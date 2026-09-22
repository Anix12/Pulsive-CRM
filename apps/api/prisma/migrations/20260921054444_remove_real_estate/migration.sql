/*
  Warnings:

  - You are about to drop the column `realEstateStage` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Integration` table. All the data in the column will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RealEstateStageHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SiteVisit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Unit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_agentId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Partner" DROP CONSTRAINT "Partner_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyPreference" DROP CONSTRAINT "PropertyPreference_contactId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyPreference" DROP CONSTRAINT "PropertyPreference_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RealEstateStageHistory" DROP CONSTRAINT "RealEstateStageHistory_contactId_fkey";

-- DropForeignKey
ALTER TABLE "RealEstateStageHistory" DROP CONSTRAINT "RealEstateStageHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_agentId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_contactId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_projectId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_tenantId_fkey";

-- DropIndex
DROP INDEX "Contact_tenantId_realEstateStage_idx";

-- DropIndex
DROP INDEX "Integration_type_externalId_idx";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "realEstateStage";

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "externalId";

-- DropTable
DROP TABLE "Booking";

-- DropTable
DROP TABLE "Partner";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "PropertyPreference";

-- DropTable
DROP TABLE "RealEstateStageHistory";

-- DropTable
DROP TABLE "SiteVisit";

-- DropTable
DROP TABLE "Unit";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "InterestLevel";

-- DropEnum
DROP TYPE "PartnerKycStatus";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "RealEstateLeadStage";

-- DropEnum
DROP TYPE "SiteVisitStatus";

-- DropEnum
DROP TYPE "UnitStatus";
