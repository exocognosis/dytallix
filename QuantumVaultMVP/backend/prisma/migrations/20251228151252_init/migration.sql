-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SECURITY_ENGINEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('TLS_ENDPOINT', 'DATABASE', 'API_ENDPOINT', 'FILE_STORAGE');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('TLS_CERTIFICATE', 'API_KEY', 'DATABASE_CREDENTIAL', 'ENCRYPTION_KEY', 'SIGNING_KEY', 'SSH_KEY', 'GENERIC_SECRET');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DISCOVERED', 'ASSESSED', 'WRAPPED_PQC', 'ATTESTED', 'ROTATED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "ExposureLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "SensitivityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttestationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TargetType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER,
    "protocol" TEXT NOT NULL DEFAULT 'https',
    "credentials" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAsset" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "assetId" TEXT,
    "discoveryDetails" JSONB NOT NULL,
    "certificateChain" TEXT,
    "tlsVersion" TEXT,
    "cipherSuite" TEXT,
    "signatureAlgorithm" TEXT,
    "publicKeyAlgorithm" TEXT,
    "publicKeySize" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "subjectAltNames" TEXT[],
    "commonName" TEXT,
    "isPqcCompliant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DISCOVERED',
    "exposure" "ExposureLevel" NOT NULL DEFAULT 'INTERNAL',
    "sensitivity" "SensitivityLevel" NOT NULL DEFAULT 'MEDIUM',
    "criticality" "CriticalityLevel" NOT NULL DEFAULT 'MEDIUM',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastScannedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetKeyMaterial" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vaultPath" TEXT NOT NULL,
    "vaultVersion" INTEGER NOT NULL DEFAULT 1,
    "keyType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AssetKeyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleDefinition" JSONB NOT NULL,
    "targetScope" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAsset" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" JSONB,

    CONSTRAINT "PolicyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "vaultKeyPath" TEXT NOT NULL,
    "vaultPrivKeyPath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrappingJob" (
    "id" TEXT NOT NULL,
    "policyId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "totalAssets" INTEGER NOT NULL DEFAULT 0,
    "processedAssets" INTEGER NOT NULL DEFAULT 0,
    "failedAssets" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrappingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrappingResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "assetId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "kemCiphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "aeadCiphertext" TEXT NOT NULL,
    "aeadTag" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "vaultPath" TEXT NOT NULL,
    "wrappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "WrappingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttestationJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "totalAssets" INTEGER NOT NULL DEFAULT 0,
    "processedAssets" INTEGER NOT NULL DEFAULT 0,
    "failedAssets" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttestationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "assetId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "attestationHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "chainId" INTEGER,
    "status" "AttestationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAssets" INTEGER NOT NULL DEFAULT 0,
    "discoveredAssets" INTEGER NOT NULL DEFAULT 0,
    "wrappedAssets" INTEGER NOT NULL DEFAULT 0,
    "attestedAssets" INTEGER NOT NULL DEFAULT 0,
    "criticalRiskAssets" INTEGER NOT NULL DEFAULT 0,
    "highRiskAssets" INTEGER NOT NULL DEFAULT 0,
    "mediumRiskAssets" INTEGER NOT NULL DEFAULT 0,
    "lowRiskAssets" INTEGER NOT NULL DEFAULT 0,
    "pqcCompliantPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "OrgSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Target_type_idx" ON "Target"("type");

-- CreateIndex
CREATE INDEX "Target_isActive_idx" ON "Target"("isActive");

-- CreateIndex
CREATE INDEX "Scan_targetId_idx" ON "Scan"("targetId");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "Scan_createdAt_idx" ON "Scan"("createdAt");

-- CreateIndex
CREATE INDEX "ScanAsset_scanId_idx" ON "ScanAsset"("scanId");

-- CreateIndex
CREATE INDEX "ScanAsset_assetId_idx" ON "ScanAsset"("assetId");

-- CreateIndex
CREATE INDEX "ScanAsset_isPqcCompliant_idx" ON "ScanAsset"("isPqcCompliant");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_fingerprint_key" ON "Asset"("fingerprint");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_riskLevel_idx" ON "Asset"("riskLevel");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_fingerprint_idx" ON "Asset"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AssetKeyMaterial_assetId_key" ON "AssetKeyMaterial"("assetId");

-- CreateIndex
CREATE INDEX "AssetKeyMaterial_vaultPath_idx" ON "AssetKeyMaterial"("vaultPath");

-- CreateIndex
CREATE INDEX "Policy_isActive_idx" ON "Policy"("isActive");

-- CreateIndex
CREATE INDEX "Policy_priority_idx" ON "Policy"("priority");

-- CreateIndex
CREATE INDEX "PolicyAsset_policyId_idx" ON "PolicyAsset"("policyId");

-- CreateIndex
CREATE INDEX "PolicyAsset_assetId_idx" ON "PolicyAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAsset_policyId_assetId_key" ON "PolicyAsset"("policyId", "assetId");

-- CreateIndex
CREATE INDEX "Anchor_isActive_idx" ON "Anchor"("isActive");

-- CreateIndex
CREATE INDEX "Anchor_algorithm_idx" ON "Anchor"("algorithm");

-- CreateIndex
CREATE INDEX "WrappingJob_status_idx" ON "WrappingJob"("status");

-- CreateIndex
CREATE INDEX "WrappingJob_createdAt_idx" ON "WrappingJob"("createdAt");

-- CreateIndex
CREATE INDEX "WrappingResult_jobId_idx" ON "WrappingResult"("jobId");

-- CreateIndex
CREATE INDEX "WrappingResult_assetId_idx" ON "WrappingResult"("assetId");

-- CreateIndex
CREATE INDEX "WrappingResult_anchorId_idx" ON "WrappingResult"("anchorId");

-- CreateIndex
CREATE INDEX "AttestationJob_status_idx" ON "AttestationJob"("status");

-- CreateIndex
CREATE INDEX "AttestationJob_createdAt_idx" ON "AttestationJob"("createdAt");

-- CreateIndex
CREATE INDEX "Attestation_jobId_idx" ON "Attestation"("jobId");

-- CreateIndex
CREATE INDEX "Attestation_assetId_idx" ON "Attestation"("assetId");

-- CreateIndex
CREATE INDEX "Attestation_txHash_idx" ON "Attestation"("txHash");

-- CreateIndex
CREATE INDEX "Attestation_status_idx" ON "Attestation"("status");

-- CreateIndex
CREATE INDEX "OrgSnapshot_timestamp_idx" ON "OrgSnapshot"("timestamp");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAsset" ADD CONSTRAINT "ScanAsset_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAsset" ADD CONSTRAINT "ScanAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetKeyMaterial" ADD CONSTRAINT "AssetKeyMaterial_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAsset" ADD CONSTRAINT "PolicyAsset_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAsset" ADD CONSTRAINT "PolicyAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappingJob" ADD CONSTRAINT "WrappingJob_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappingResult" ADD CONSTRAINT "WrappingResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WrappingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappingResult" ADD CONSTRAINT "WrappingResult_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappingResult" ADD CONSTRAINT "WrappingResult_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AttestationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

