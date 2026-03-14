-- CreateEnum
CREATE TYPE "ManagedCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ManagedCredential" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "deviceKeyAlgorithm" TEXT NOT NULL,
    "devicePublicKey" TEXT NOT NULL,
    "devicePublicKeyHash" TEXT NOT NULL,
    "networkZone" "NetworkZone" NOT NULL DEFAULT 'UNKNOWN',
    "locationLabel" TEXT,
    "locationCode" TEXT,
    "status" "ManagedCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedReason" TEXT,
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "issuedByUserId" TEXT,
    "revokedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedCredential_assignedUserId_status_createdAt_idx" ON "ManagedCredential"("assignedUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ManagedCredential_deviceId_status_createdAt_idx" ON "ManagedCredential"("deviceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ManagedCredential_networkZone_status_createdAt_idx" ON "ManagedCredential"("networkZone", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ManagedCredential_devicePublicKeyHash_idx" ON "ManagedCredential"("devicePublicKeyHash");

-- AddForeignKey
ALTER TABLE "ManagedCredential" ADD CONSTRAINT "ManagedCredential_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedCredential" ADD CONSTRAINT "ManagedCredential_issuedByUserId_fkey"
    FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedCredential" ADD CONSTRAINT "ManagedCredential_revokedByUserId_fkey"
    FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
