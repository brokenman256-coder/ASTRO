-- CreateTable
CREATE TABLE "KundliReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "timeOfBirth" TEXT,
    "placeOfBirth" TEXT,
    "resultText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KundliReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "person1Name" TEXT NOT NULL,
    "person1Dob" TIMESTAMP(3) NOT NULL,
    "person2Name" TEXT NOT NULL,
    "person2Dob" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "resultText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KundliMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPanchang" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "resultText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPanchang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPanchang_date_key" ON "DailyPanchang"("date");

-- AddForeignKey
ALTER TABLE "KundliReading" ADD CONSTRAINT "KundliReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliMatch" ADD CONSTRAINT "KundliMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
