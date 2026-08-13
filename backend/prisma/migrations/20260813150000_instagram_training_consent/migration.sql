-- Instagram Login + opt-in training corpus (chats/stories/media).
-- Nothing is imported unless User.trainingConsent is true.

ALTER TABLE "User" ADD COLUMN "instagramUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "instagramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "instagramAccountType" TEXT;
ALTER TABLE "User" ADD COLUMN "instagramAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "instagramTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "trainingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "trainingConsentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "trainingConsentRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_instagramUserId_key" ON "User"("instagramUserId");

CREATE TYPE "InstagramItemKind" AS ENUM ('PROFILE', 'MEDIA', 'STORY', 'MESSAGE');
CREATE TYPE "InstagramImportSource" AS ENUM ('GRAPH_API', 'DATA_EXPORT');
CREATE TYPE "InstagramImportStatus" AS ENUM ('PENDING', 'IMPORTED', 'PARTIAL', 'FAILED');

CREATE TABLE "InstagramImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "InstagramImportSource" NOT NULL,
    "status" "InstagramImportStatus" NOT NULL DEFAULT 'PENDING',
    "mediaCount" INTEGER NOT NULL DEFAULT 0,
    "storyCount" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstagramTrainingItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "kind" "InstagramItemKind" NOT NULL,
    "externalId" TEXT,
    "threadId" TEXT,
    "sender" TEXT,
    "text" TEXT,
    "mediaUrl" TEXT,
    "timestamp" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramTrainingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstagramImport_userId_createdAt_idx" ON "InstagramImport"("userId", "createdAt");
CREATE INDEX "InstagramTrainingItem_userId_kind_idx" ON "InstagramTrainingItem"("userId", "kind");
CREATE INDEX "InstagramTrainingItem_importId_idx" ON "InstagramTrainingItem"("importId");

ALTER TABLE "InstagramImport" ADD CONSTRAINT "InstagramImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstagramTrainingItem" ADD CONSTRAINT "InstagramTrainingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstagramTrainingItem" ADD CONSTRAINT "InstagramTrainingItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "InstagramImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
