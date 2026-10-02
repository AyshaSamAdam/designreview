-- CreateTable
CREATE TABLE "DiagramInvite" (
    "id" TEXT NOT NULL,
    "diagramId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagramInvite_tokenHash_key" ON "DiagramInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "DiagramInvite_diagramId_idx" ON "DiagramInvite"("diagramId");

-- AddForeignKey
ALTER TABLE "DiagramInvite" ADD CONSTRAINT "DiagramInvite_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
