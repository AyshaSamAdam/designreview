-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "diagramId" TEXT,
ADD COLUMN     "endedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Interview_userId_diagramId_createdAt_idx" ON "Interview"("userId", "diagramId", "createdAt");
