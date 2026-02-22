import { scoreAddressBehavior } from './dytallix-fast-launch/server/services/vector/agent.js';

const benignFeatures = {
    tx_count: 50,
    tx_count_last_hour: 2,
    unique_counterparties: 15,
    high_risk_tx_count: 0,
    critical_risk_tx_count: 0,
    feedback_count: 0,
    confirmed_risk_feedback: 0,
    wallet_score: 10,
    wallet_total_transactions: 100,
    counterparty_risk_distribution_raw: [40, 10, 0, 0], // Mostly low risk
    temporal_velocity_distribution_raw: [2, 10, 38] // Evenly distributed over time
};

const scammerFeatures = {
    tx_count: 50,
    tx_count_last_hour: 40, // Huge spike
    unique_counterparties: 5,
    high_risk_tx_count: 20,
    critical_risk_tx_count: 10,
    feedback_count: 0,
    confirmed_risk_feedback: 0,
    wallet_score: 50,
    wallet_total_transactions: 50,
    counterparty_risk_distribution_raw: [5, 15, 20, 10], // High exposure to risk
    temporal_velocity_distribution_raw: [40, 5, 5] // Huge velocity spike
};

console.log("=== BENIGN PROFILE ===");
const benignScore = scoreAddressBehavior(benignFeatures);
console.log(JSON.stringify(benignScore, null, 2));

console.log("\n=== SCAMMER PROFILE (Information Geometry matched) ===");
const scammerScore = scoreAddressBehavior(scammerFeatures);
console.log(JSON.stringify(scammerScore, null, 2));

const diff = scammerScore.risk_score_0_1 - benignScore.risk_score_0_1;
console.log(`\nRisk difference: ${diff.toFixed(4)}`);
