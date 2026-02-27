-- AlterTable
ALTER TABLE "Project" ADD COLUMN "whitepaperDocId" TEXT;

-- CreateIndex
CREATE INDEX "Project_whitepaperDocId_idx" ON "Project"("whitepaperDocId");
