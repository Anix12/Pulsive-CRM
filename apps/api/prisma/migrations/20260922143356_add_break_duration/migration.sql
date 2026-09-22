-- AlterTable
ALTER TABLE "AgentBreakLog" ADD COLUMN     "durationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "AgentPresence" ADD COLUMN     "breakDurationMinutes" INTEGER;
