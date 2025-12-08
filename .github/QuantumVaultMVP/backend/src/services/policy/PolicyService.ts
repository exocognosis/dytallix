import { PrismaClient, Asset, EncryptionPolicy, ScopeType, AssetType, Environment, RiskLevel, PolicyAsset } from '@prisma/client';

const prisma = new PrismaClient();

export class PolicyService {

    /**
     * Evaluates all active policies against all assets.
     * Updates PolicyAsset table.
     */
    async evaluateAllPolicies() {
        const policies = await prisma.encryptionPolicy.findMany({ where: { isActive: true } });
        const assets = await prisma.asset.findMany();

        for (const policy of policies) {
            await this.evaluatePolicy(policy, assets);
        }
    }

    async evaluatePolicy(policy: EncryptionPolicy, assets: Asset[]) {
        // Clean up old associations? Or just upsert.
        // For MVP, we iterate and upsert.

        const scope = policy.scopeDefinition as any; // { type: [], environment: [], minRisk: ... }

        for (const asset of assets) {
            const isMatch = this.checkScope(asset, policy.scopeType, scope);

            if (isMatch) {
                // Check compliance
                // Asset is compliant if:
                // 1. It is already PQC wrapped (wrapperEnabled = true)
                // 2. AND the wrapper algorithm matches one of the policy required algos (simplified check)

                const isCompliant = this.checkCompliance(asset, policy);

                // Upsert PolicyAsset
                const existing = await prisma.policyAsset.findFirst({
                    where: { policyId: policy.id, assetId: asset.id }
                });

                if (existing) {
                    await prisma.policyAsset.update({
                        where: { id: existing.id },
                        data: { isCompliant, lastEvaluatedAt: new Date() }
                    });
                } else {
                    await prisma.policyAsset.create({
                        data: {
                            policyId: policy.id,
                            assetId: asset.id,
                            isCompliant
                        }
                    });
                }
            } else {
                // If it was previously matched but no longer, we might need to remove it?
                // Leaving out for MVP simplicity (assuming additive scope mostly).
            }
        }
    }

    checkScope(asset: Asset, scopeType: ScopeType, scopeDef: any): boolean {
        if (scopeType === ScopeType.ALL_ASSETS) return true;

        // Check constraints if they exist
        if (scopeDef.type && scopeDef.type.length > 0) {
            if (!scopeDef.type.includes(asset.type)) return false;
        }

        if (scopeDef.environment && scopeDef.environment.length > 0) {
            // Simple string comparison or mapping
            if (!scopeDef.environment.includes(asset.environment)) return false;
        }

        if (scopeDef.minRisk) {
            // Logic to compare risk levels (LOW < MEDIUM < HIGH < CRITICAL)
            const levels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
            const assetIdx = levels.indexOf(asset.riskLevel);
            const minIdx = levels.indexOf(scopeDef.minRisk);
            if (assetIdx < minIdx) return false;
        }

        return true;
    }

    checkCompliance(asset: Asset, policy: EncryptionPolicy): boolean {
        if (asset.pqcCompliance === 'COMPLIANT') return true; // Native PQC

        if (asset.wrapperEnabled) {
            // Check if wrapper algo is allowed
            // Simplified: just check if wrapper is enabled for MVP
            return true;
        }

        return false;
    }
}
