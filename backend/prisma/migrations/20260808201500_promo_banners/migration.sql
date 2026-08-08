-- CreateTable
CREATE TABLE "PromoBanner" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoBotSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 120,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoBotSettings_pkey" PRIMARY KEY ("id")
);
