-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "engines" "Engine"[],
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "currentPrompt" TEXT,
    "currentEngine" "Engine",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Result" ADD COLUMN "jobId" TEXT;

-- CreateIndex
CREATE INDEX "Job_brandId_createdAt_idx" ON "Job"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Result_jobId_idx" ON "Result"("jobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
