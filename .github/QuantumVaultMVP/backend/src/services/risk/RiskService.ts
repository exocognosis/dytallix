import { Asset, RiskLevel, BusinessCriticality, DataSensitivity, Exposure, PqcCompliance } from '@prisma/client';

export class RiskService {

    calculateRiskScore(asset: Asset): { score: number, riskLevel: RiskLevel } {
        let baseAlgo = 60;
        if (asset.pqcCompliance === PqcCompliance.COMPLIANT) {
            baseAlgo = 10;
        } else if (asset.wrapperEnabled) {
            // Hybrid/Wrapped
            baseAlgo = 30;
            // NOTE: The requirements say if asset uses hybrid, score is 30.
            // If it's wrapped by US (QuantumVault), we consider it hybrid/protected.
        }

        // Exposure Weight
        let exposureWeight = 5;
        if (asset.exposure === Exposure.INTERNET_FACING) exposureWeight = 25;
        else if (asset.exposure === Exposure.PARTNER) exposureWeight = 15;

        // Sensitivity Weight
        let sensitivityWeight = 8;
        if (asset.dataSensitivity === DataSensitivity.RESTRICTED) sensitivityWeight = 25;
        else if (asset.dataSensitivity === DataSensitivity.CONFIDENTIAL) sensitivityWeight = 15;
        else if (asset.dataSensitivity === DataSensitivity.PUBLIC) sensitivityWeight = 0;

        // Criticality Weight
        let criticalityWeight = 0;
        if (asset.businessCriticality === BusinessCriticality.HIGH) criticalityWeight = 20;
        else if (asset.businessCriticality === BusinessCriticality.MEDIUM) criticalityWeight = 10;

        // Staleness
        const daysSinceScan = Math.floor((new Date().getTime() - asset.lastScanTimestamp.getTime()) / (1000 * 3600 * 24));
        let stalenessWeight = 15;
        if (daysSinceScan <= 7) stalenessWeight = 0;
        else if (daysSinceScan <= 30) stalenessWeight = 5;
        else if (daysSinceScan <= 90) stalenessWeight = 10;

        let rawScore = baseAlgo + exposureWeight + sensitivityWeight + criticalityWeight + stalenessWeight;

        // Normalize
        const score = Math.max(0, Math.min(100, rawScore));

        // Risk Level Mapping
        let riskLevel: RiskLevel = RiskLevel.CRITICAL;
        if (score <= 24) riskLevel = RiskLevel.LOW;
        else if (score <= 49) riskLevel = RiskLevel.MEDIUM;
        else if (score <= 74) riskLevel = RiskLevel.HIGH;

        return { score, riskLevel };
    }
}
