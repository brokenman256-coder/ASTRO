-- AlterTable
ALTER TABLE "Conversation"
  ADD COLUMN "billedMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "costPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WalletTransaction"
  ADD COLUMN "note" TEXT,
  ADD COLUMN "conversationId" TEXT;

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minRechargeAmountPaise" INTEGER NOT NULL DEFAULT 10000,
    "minSessionMinutes" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
