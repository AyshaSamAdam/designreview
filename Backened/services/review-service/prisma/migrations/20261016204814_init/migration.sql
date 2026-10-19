-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('missed', 'partial', 'solid');

-- CreateEnum
CREATE TYPE "Author" AS ENUM ('interviewer', 'you');

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "boxLabel" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "grade" "Grade",
    "feedback" TEXT,
    "covered" JSONB NOT NULL DEFAULT '[]',
    "missing" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "interviewId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "author" "Author" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_userId_createdAt_idx" ON "Interview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Interview_reviewId_idx" ON "Interview"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_interviewId_position_key" ON "Message"("interviewId", "position");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
