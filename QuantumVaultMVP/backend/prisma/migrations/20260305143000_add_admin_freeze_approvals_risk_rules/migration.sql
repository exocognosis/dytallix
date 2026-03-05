-- AlterTable
ALTER TABLE "Asset"
    ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "freezeReason" TEXT,
    ADD COLUMN "frozenAt" TIMESTAMP(3),
    ADD COLUMN "frozenByUserId" TEXT;

-- CreateEnum
CREATE TYPE "AdminApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminApprovalOperation" AS ENUM ('PIPELINE_TRANSFER', 'WRAPPING_JOB', 'ATTESTATION_SUBMISSION');

-- CreateTable
CREATE TABLE "AdminApproval" (
    "id" TEXT NOT NULL,
    "operationType" "AdminApprovalOperation" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "status" "AdminApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestContext" JSONB,
    "requestedByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRiskRule" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL DEFAULT 'default',
    "maxRiskScoreAutoApprove" INTEGER NOT NULL DEFAULT 70,
    "requireApprovalAtRiskLevel" "RiskLevel" NOT NULL DEFAULT 'HIGH',
    "maxAssetsPerRun" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_isFrozen_idx" ON "Asset"("isFrozen");

-- CreateIndex
CREATE INDEX "Asset_frozenByUserId_idx" ON "Asset"("frozenByUserId");

-- CreateIndex
CREATE INDEX "AdminApproval_status_createdAt_idx" ON "AdminApproval"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminApproval_operationType_resourceType_resourceId_idx" ON "AdminApproval"("operationType", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRiskRule_ruleKey_key" ON "AdminRiskRule"("ruleKey");

-- CreateIndex
CREATE INDEX "AdminRiskRule_isActive_idx" ON "AdminRiskRule"("isActive");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_frozenByUserId_fkey"
    FOREIGN KEY ("frozenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminApproval" ADD CONSTRAINT "AdminApproval_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminApproval" ADD CONSTRAINT "AdminApproval_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRiskRule" ADD CONSTRAINT "AdminRiskRule_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
