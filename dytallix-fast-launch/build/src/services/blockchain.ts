export interface BlockchainStatus {
    blockHeight: number
    blockTime: number
    validators: number
    tps: number
    nodeHealth: number
}

const NODE_URL = "http://localhost:3030";

export const blockchainService = {
    getStatus: async (): Promise<BlockchainStatus> => {
        try {
            // Fetch status from real node
            const statusRes = await fetch(`${NODE_URL}/status`);
            if (!statusRes.ok) throw new Error("Node unreachable");
            const statusData = await statusRes.json();

            // Fetch metrics for TPS
            const metricsRes = await fetch(`${NODE_URL}/metrics`);
            let tps = 0;
            if (metricsRes.ok) {
                const metricsText = await metricsRes.text();
                // Simple parse for prometheus format "dyt_tps 123"
                const match = metricsText.match(/dyt_tps\s+(\d+(\.\d+)?)/);
                if (match) tps = parseFloat(match[1]);
            }

            return {
                blockHeight: statusData.height || 0,
                blockTime: 2.0, // Target block time
                validators: statusData.validators || 3, // Default to 3 if not in status
                tps: tps,
                nodeHealth: 100,
            }
        } catch (e) {
            console.error("Failed to fetch blockchain status:", e);
            // Fallback to offline/error state
            return {
                blockHeight: 0,
                blockTime: 0,
                validators: 0,
                tps: 0,
                nodeHealth: 0,
            }
        }
    },
}
