-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "amenities" JSONB;

-- AlterTable
ALTER TABLE "PropertyPreference" ADD COLUMN     "amenities" JSONB,
ADD COLUMN     "commutePreference" TEXT,
ADD COLUMN     "facing" TEXT,
ADD COLUMN     "preferredFloor" INTEGER;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "facing" TEXT;
