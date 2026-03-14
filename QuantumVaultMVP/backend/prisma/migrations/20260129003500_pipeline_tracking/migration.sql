-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PipelineAssetStatus" AS ENUM ('IDENTIFIED', 'CATEGORIZED', 'ANALYZED', 'NIST_ASSIGNED', 'SKIPPED', 'WRAPPED_PQC', 'TRANSFERRED', 'FAILED');

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "sourceRoots" TEXT[],
    "destinationRoots" TEXT[],
    "manifestSha" JSONB,
    "startedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineAsset" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "objectId" TEXT,
    "relativePath" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT,
    "status" "PipelineAssetStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "pqcStatus" TEXT,
    "pqcProtected" BOOLEAN NOT NULL DEFAULT false,
    "dataDomain" TEXT,
    "cryptoDomain" TEXT,
    "expectedPolicyOutcome" TEXT,
    "plaintextSha256" TEXT,
    "manifestSha256" TEXT,
    "fileSizeBytes" INTEGER,
    "nistLevel" INTEGER,
    "metadata" JSONB,
    "stageTimestamps" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");

-- CreateIndex
CREATE INDEX "PipelineRun_startedAt_idx" ON "PipelineRun"("startedAt");

-- CreateIndex
CREATE INDEX "PipelineAsset_runId_idx" ON "PipelineAsset"("runId");

-- CreateIndex
CREATE INDEX "PipelineAsset_status_idx" ON "PipelineAsset"("status");

-- CreateIndex
CREATE INDEX "PipelineAsset_pqcProtected_idx" ON "PipelineAsset"("pqcProtected");

-- AddForeignKey
ALTER TABLE "PipelineAsset" ADD CONSTRAINT "PipelineAsset_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "PipelineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
