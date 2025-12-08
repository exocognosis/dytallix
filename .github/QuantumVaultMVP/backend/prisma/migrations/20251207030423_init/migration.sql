-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('TLS_CERT', 'DATABASE', 'API_ENDPOINT', 'FILE_SHARE', 'KEY', 'APPLICATION', 'PROTOCOL', 'OTHER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PROD', 'STAGE', 'DEV', 'OTHER');

-- CreateEnum
CREATE TYPE "PqcCompliance" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BusinessCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "Exposure" AS ENUM ('INTERNET_FACING', 'INTERNAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AT_RISK', 'IN_REMEDIATION', 'WRAPPED_PQC', 'ATTESTED');

-- CreateEnum
CREATE TYPE "KeyType" AS ENUM ('PRIVATE_KEY', 'API_SECRET', 'DB_CREDENTIAL', 'CONFIG_BLOB', 'OTHER');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('DISCOVERY', 'RESCAN', 'POLICY_VALIDATION');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('NEW', 'UPDATED', 'UNCHANGED');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ALL_ASSETS', 'BY_TYPE', 'BY_ENVIRONMENT', 'BY_TAG', 'BY_RISK_LEVEL', 'CUSTOM_QUERY');

-- CreateEnum
CREATE TYPE "TransitionStrategy" AS ENUM ('HYBRID', 'PQC_ONLY');

-- CreateEnum
CREATE TYPE "EnforcementMode" AS ENUM ('MONITOR_ONLY', 'ENFORCE');

-- CreateEnum
CREATE TYPE "AnchorType" AS ENUM ('ROOT_OF_TRUST', 'KEY_HIERARCHY', 'POLICY_BUNDLE');

-- CreateEnum
CREATE TYPE "AttestationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttestationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER', 'SECURITY_ENGINEER');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "location" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "crypto_algorithms_in_use" JSONB NOT NULL,
    "pqc_compliance" "PqcCompliance" NOT NULL DEFAULT 'UNKNOWN',
    "quantum_risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "business_criticality" "BusinessCriticality" NOT NULL DEFAULT 'LOW',
    "data_sensitivity" "DataSensitivity" NOT NULL DEFAULT 'INTERNAL',
    "exposure" "Exposure" NOT NULL DEFAULT 'INTERNAL',
    "last_scan_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AssetStatus" NOT NULL DEFAULT 'AT_RISK',
    "wrapper_enabled" BOOLEAN NOT NULL DEFAULT false,
    "wrapper_algorithm" TEXT,
    "wrapper_anchor_id" TEXT,
    "wrapper_last_updated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetKeyMaterial" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "key_type" "KeyType" NOT NULL,
    "storage_reference" TEXT NOT NULL,
    "wrapped_pqc_key_reference" TEXT,
    "last_wrapped_at" TIMESTAMPTZ,
    "is_pqc_wrapped" BOOLEAN NOT NULL DEFAULT false,
    "algorithm_details" JSONB NOT NULL,

    CONSTRAINT "AssetKeyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "triggered_by" TEXT,
    "scan_type" "ScanType" NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "number_of_assets_scanned" INTEGER NOT NULL DEFAULT 0,
    "number_of_non_pqc_assets_found" INTEGER NOT NULL DEFAULT 0,
    "status" "ScanStatus" NOT NULL DEFAULT 'RUNNING',
    "error_message" TEXT,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAsset" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "scan_result" "ScanResult" NOT NULL,
    "details" JSONB,

    CONSTRAINT "ScanAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptionPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope_type" "ScopeType" NOT NULL,
    "scope_definition" JSONB NOT NULL,
    "required_pqc_algorithms" JSONB NOT NULL,
    "transition_strategy" "TransitionStrategy" NOT NULL,
    "enforcement_mode" "EnforcementMode" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "EncryptionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAsset" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "is_compliant" BOOLEAN NOT NULL DEFAULT false,
    "last_evaluated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptionAnchor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "anchor_type" "AnchorType" NOT NULL,
    "associated_policy_ids" JSONB NOT NULL,
    "root_public_key_reference" TEXT NOT NULL,
    "root_key_algorithm" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "EncryptionAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainAttestationJob" (
    "id" TEXT NOT NULL,
    "created_by" TEXT,
    "anchor_id" TEXT NOT NULL,
    "filters" JSONB,
    "total_assets" INTEGER NOT NULL DEFAULT 0,
    "succeeded_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "status" "AttestationJobStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "blockchain_network" TEXT NOT NULL,

    CONSTRAINT "BlockchainAttestationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainAttestation" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "anchor_id" TEXT NOT NULL,
    "attestation_status" "AttestationStatus" NOT NULL DEFAULT 'PENDING',
    "blockchain_tx_id" TEXT,
    "attested_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "payload_hash" TEXT NOT NULL,

    CONSTRAINT "BlockchainAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRiskSnapshot" (
    "id" TEXT NOT NULL,
    "snapshot_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_assets" INTEGER NOT NULL,
    "total_non_pqc_assets" INTEGER NOT NULL,
    "total_wrapped_pqc_assets" INTEGER NOT NULL,
    "total_attested_assets" INTEGER NOT NULL,
    "high_risk_assets_count" INTEGER NOT NULL,
    "medium_risk_assets_count" INTEGER NOT NULL,
    "low_risk_assets_count" INTEGER NOT NULL,
    "critical_risk_assets_count" INTEGER NOT NULL,
    "policy_coverage_percent" DOUBLE PRECISION NOT NULL,
    "assets_out_of_policy" INTEGER NOT NULL,
    "comments" TEXT,

    CONSTRAINT "OrganizationRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_wrapper_anchor_id_fkey" FOREIGN KEY ("wrapper_anchor_id") REFERENCES "EncryptionAnchor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetKeyMaterial" ADD CONSTRAINT "AssetKeyMaterial_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAsset" ADD CONSTRAINT "ScanAsset_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "Scan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAsset" ADD CONSTRAINT "ScanAsset_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAsset" ADD CONSTRAINT "PolicyAsset_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "EncryptionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAsset" ADD CONSTRAINT "PolicyAsset_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainAttestationJob" ADD CONSTRAINT "BlockchainAttestationJob_anchor_id_fkey" FOREIGN KEY ("anchor_id") REFERENCES "EncryptionAnchor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainAttestation" ADD CONSTRAINT "BlockchainAttestation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "BlockchainAttestationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainAttestation" ADD CONSTRAINT "BlockchainAttestation_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainAttestation" ADD CONSTRAINT "BlockchainAttestation_anchor_id_fkey" FOREIGN KEY ("anchor_id") REFERENCES "EncryptionAnchor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
