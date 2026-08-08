-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('USER', 'ASTROLOGER');

-- AlterTable
ALTER TABLE "Astrologer"
  ADD COLUMN "personality" TEXT NOT NULL DEFAULT 'Warm, thoughtful, and attentive.',
  ADD COLUMN "tone" TEXT NOT NULL DEFAULT 'Conversational and reassuring',
  ADD COLUMN "languages" TEXT[] DEFAULT ARRAY['English']::TEXT[],
  ADD COLUMN "greeting" TEXT NOT NULL DEFAULT 'Welcome. Tell me what has been on your mind lately.',
  ADD COLUMN "astrologyStyle" TEXT NOT NULL DEFAULT 'Vedic Astrology',
  ADD COLUMN "systemInstructions" TEXT NOT NULL DEFAULT 'Give astrology-oriented guidance for entertainment purposes. Ask relevant follow-up questions. Do not claim certainty about the future.',
  ADD COLUMN "priceRupeesPerMinute" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "consultationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "tokenUsage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "tokens" INTEGER NOT NULL,
    "estimatedCostPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAISettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "apiUrl" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5',
    "encryptedApiKey" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "maxResponseTokens" INTEGER NOT NULL DEFAULT 500,
    "maxMessagesPerSession" INTEGER NOT NULL DEFAULT 25,
    "maxSessionMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxMessagesPerUserPerDay" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAISettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_createdAt_idx" ON "UsageRecord"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "Astrologer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
