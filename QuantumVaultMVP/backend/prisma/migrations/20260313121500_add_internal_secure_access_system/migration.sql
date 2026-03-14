-- CreateEnum
CREATE TYPE "AuthSource" AS ENUM ('LOCAL', 'ACTIVE_DIRECTORY', 'AZURE_AD', 'OKTA', 'ENTERPRISE_IAM');

-- CreateEnum
CREATE TYPE "ClearanceLevel" AS ENUM ('L0_INTERNAL', 'L1_SENSITIVE', 'L2_CONFIDENTIAL', 'L3_RESTRICTED', 'L4_CRITICAL');

-- CreateEnum
CREATE TYPE "ClassificationLevel" AS ENUM ('L0_INTERNAL', 'L1_SENSITIVE', 'L2_CONFIDENTIAL', 'L3_RESTRICTED', 'L4_CRITICAL');

-- CreateEnum
CREATE TYPE "DeviceComplianceStatus" AS ENUM ('UNKNOWN', 'MANAGED', 'HARDENED', 'SECURE_WORKSTATION', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "NetworkZone" AS ENUM ('UNKNOWN', 'INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "EncryptionState" AS ENUM ('UNENCRYPTED', 'PQC_WRAPPED', 'SESSION_REWRAPPED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "AssetLifecycleState" AS ENUM ('DISCOVERED', 'CLASSIFIED', 'ENCRYPTED', 'STORED', 'AVAILABLE', 'ACCESS_REQUESTED', 'ACCESS_GRANTED', 'ACCESS_EXPIRED', 'REVOKED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'CONTROLLED_DOWNLOAD');

-- CreateEnum
CREATE TYPE "AccessDecision" AS ENUM ('APPROVED', 'DENIED', 'APPROVAL_REQUIRED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AccessSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('DISCOVERY', 'CLASSIFICATION', 'ENCRYPTION', 'KEY_GENERATION', 'STORAGE_WRITE', 'ACCESS_REQUEST', 'APPROVAL', 'DENIAL', 'SESSION_START', 'SESSION_END', 'REVOCATION', 'DELETION');

-- AlterEnum
ALTER TYPE "AdminApprovalOperation" ADD VALUE IF NOT EXISTS 'ACCESS_SESSION';

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "authSource" "AuthSource" NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN "employeeId" TEXT,
    ADD COLUMN "department" TEXT,
    ADD COLUMN "clearanceLevel" "ClearanceLevel" NOT NULL DEFAULT 'L0_INTERNAL',
    ADD COLUMN "projectMemberships" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "lastMfaAt" TIMESTAMP(3),
    ADD COLUMN "breakGlass" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session"
    ADD COLUMN "authSource" "AuthSource" NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN "idpSubject" TEXT,
    ADD COLUMN "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "stepUpSatisfied" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "deviceId" TEXT,
    ADD COLUMN "deviceCompliance" "DeviceComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN "deviceTrustLevel" TEXT,
    ADD COLUMN "networkZone" "NetworkZone" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN "ipAddress" TEXT,
    ADD COLUMN "sessionClaims" JSONB;

-- AlterTable
ALTER TABLE "PipelineAsset"
    ADD COLUMN "classificationLevel" "ClassificationLevel" NOT NULL DEFAULT 'L0_INTERNAL',
    ADD COLUMN "ownerDepartment" TEXT,
    ADD COLUMN "storageLocation" TEXT,
    ADD COLUMN "encryptionState" "EncryptionState" NOT NULL DEFAULT 'UNENCRYPTED',
    ADD COLUMN "keyManifestRef" TEXT,
    ADD COLUMN "authorizedRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "retentionPolicy" TEXT,
    ADD COLUMN "lifecycleState" "AssetLifecycleState" NOT NULL DEFAULT 'DISCOVERED',
    ADD COLUMN "integrityCheckTimestamp" TIMESTAMP(3),
    ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "legalHoldReason" TEXT,
    ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "lastAccessAt" TIMESTAMP(3),
    ADD COLUMN "accessHistoryRef" TEXT;

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "pipelineAssetId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "requestedAction" "AccessAction" NOT NULL,
    "requestedTtlSeconds" INTEGER NOT NULL,
    "decision" "AccessDecision" NOT NULL,
    "decisionReason" TEXT,
    "policyVersion" TEXT NOT NULL,
    "policyHash" TEXT NOT NULL,
    "classificationLevel" "ClassificationLevel" NOT NULL,
    "requesterClearanceLevel" "ClearanceLevel" NOT NULL,
    "requesterDepartment" TEXT,
    "requesterRole" TEXT,
    "requesterProjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deviceId" TEXT,
    "deviceCompliance" "DeviceComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "networkZone" "NetworkZone" NOT NULL DEFAULT 'UNKNOWN',
    "approvalId" TEXT,
    "approvalHash" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "context" JSONB,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessSession" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "pipelineAssetId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "wrapKeyVaultPath" TEXT NOT NULL,
    "rewrappedKeyNonce" TEXT NOT NULL,
    "rewrappedKeyCiphertext" TEXT NOT NULL,
    "rewrappedKeyTag" TEXT NOT NULL,
    "rewrapAlgorithm" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "allowedAction" "AccessAction" NOT NULL,
    "status" "AccessSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blockchainTxHash" TEXT,
    "blockchainBlockNumber" BIGINT,
    "metadata" JSONB,

    CONSTRAINT "AccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLedgerEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "pipelineAssetId" TEXT,
    "accessRequestId" TEXT,
    "accessSessionId" TEXT,
    "userId" TEXT,
    "role" TEXT,
    "deviceId" TEXT,
    "location" TEXT,
    "networkZone" "NetworkZone",
    "policyVersion" TEXT,
    "policyHash" TEXT,
    "assetHash" TEXT,
    "previousEventHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "signatureAlgorithm" TEXT NOT NULL,
    "digitalSignature" TEXT NOT NULL,
    "blockchainTxHash" TEXT,
    "blockchainBlockNumber" BIGINT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- CreateIndex
CREATE INDEX "PipelineAsset_classificationLevel_idx" ON "PipelineAsset"("classificationLevel");

-- CreateIndex
CREATE INDEX "PipelineAsset_lifecycleState_idx" ON "PipelineAsset"("lifecycleState");

-- CreateIndex
CREATE INDEX "PipelineAsset_legalHold_idx" ON "PipelineAsset"("legalHold");

-- CreateIndex
CREATE INDEX "AccessRequest_pipelineAssetId_requestedAt_idx" ON "AccessRequest"("pipelineAssetId", "requestedAt");

-- CreateIndex
CREATE INDEX "AccessRequest_requesterUserId_requestedAt_idx" ON "AccessRequest"("requesterUserId", "requestedAt");

-- CreateIndex
CREATE INDEX "AccessRequest_decision_requestedAt_idx" ON "AccessRequest"("decision", "requestedAt");

-- CreateIndex
CREATE INDEX "AccessRequest_approvalId_idx" ON "AccessRequest"("approvalId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessSession_accessRequestId_key" ON "AccessSession"("accessRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessSession_sessionTokenHash_key" ON "AccessSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AccessSession_pipelineAssetId_status_expiresAt_idx" ON "AccessSession"("pipelineAssetId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "AccessSession_requesterUserId_status_expiresAt_idx" ON "AccessSession"("requesterUserId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLedgerEvent_eventHash_key" ON "AuditLedgerEvent"("eventHash");

-- CreateIndex
CREATE INDEX "AuditLedgerEvent_pipelineAssetId_createdAt_idx" ON "AuditLedgerEvent"("pipelineAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLedgerEvent_accessRequestId_createdAt_idx" ON "AuditLedgerEvent"("accessRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLedgerEvent_accessSessionId_createdAt_idx" ON "AuditLedgerEvent"("accessSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLedgerEvent_eventType_createdAt_idx" ON "AuditLedgerEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLedgerEvent_userId_createdAt_idx" ON "AuditLedgerEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_pipelineAssetId_fkey"
    FOREIGN KEY ("pipelineAssetId") REFERENCES "PipelineAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_requesterUserId_fkey"
    FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_approvalId_fkey"
    FOREIGN KEY ("approvalId") REFERENCES "AdminApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessSession" ADD CONSTRAINT "AccessSession_accessRequestId_fkey"
    FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessSession" ADD CONSTRAINT "AccessSession_pipelineAssetId_fkey"
    FOREIGN KEY ("pipelineAssetId") REFERENCES "PipelineAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessSession" ADD CONSTRAINT "AccessSession_requesterUserId_fkey"
    FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLedgerEvent" ADD CONSTRAINT "AuditLedgerEvent_pipelineAssetId_fkey"
    FOREIGN KEY ("pipelineAssetId") REFERENCES "PipelineAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLedgerEvent" ADD CONSTRAINT "AuditLedgerEvent_accessRequestId_fkey"
    FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLedgerEvent" ADD CONSTRAINT "AuditLedgerEvent_accessSessionId_fkey"
    FOREIGN KEY ("accessSessionId") REFERENCES "AccessSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLedgerEvent" ADD CONSTRAINT "AuditLedgerEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
