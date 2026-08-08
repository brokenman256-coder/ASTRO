-- AlterTable
ALTER TABLE "AstrologerBotSettings"
  ADD COLUMN "refreshEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "refreshIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "refreshBatchSize" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "lastRefreshAt" TIMESTAMP(3);
