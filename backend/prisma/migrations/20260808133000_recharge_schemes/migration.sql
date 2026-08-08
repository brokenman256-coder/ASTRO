-- AlterTable
ALTER TABLE "WalletTransaction"
  ADD COLUMN "bonusPaise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RechargeScheme" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minAmountPaise" INTEGER NOT NULL,
    "bonusPercent" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeScheme_pkey" PRIMARY KEY ("id")
);
