CREATE TABLE "ServiceAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "clientSecretHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "clearanceLevel" "ClearanceLevel" NOT NULL DEFAULT 'L0_INTERNAL',
    "department" TEXT,
    "projectMemberships" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedNetworkZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secretRotatedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceAccount_clientId_key" ON "ServiceAccount"("clientId");
CREATE UNIQUE INDEX "ServiceAccount_userId_key" ON "ServiceAccount"("userId");
CREATE INDEX "ServiceAccount_isActive_createdAt_idx" ON "ServiceAccount"("isActive", "createdAt");

ALTER TABLE "ServiceAccount"
ADD CONSTRAINT "ServiceAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
