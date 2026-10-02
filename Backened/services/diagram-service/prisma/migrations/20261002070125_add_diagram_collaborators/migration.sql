-- CreateTable
CREATE TABLE "DiagramCollaborator" (
    "id" TEXT NOT NULL,
    "diagramId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagramCollaborator_userId_idx" ON "DiagramCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramCollaborator_diagramId_userId_key" ON "DiagramCollaborator"("diagramId", "userId");

-- AddForeignKey
ALTER TABLE "DiagramCollaborator" ADD CONSTRAINT "DiagramCollaborator_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
