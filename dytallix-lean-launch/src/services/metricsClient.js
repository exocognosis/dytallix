// Mock metrics client to fix build error
export const fetchNetworkMetrics = async () => {
    return {
        tps: 1250,
        latency: 45,
        activeNodes: 85,
        blockTime: 2.5
    };
};

export const fetchSystemHealth = async () => {
    return {
        status: 'healthy',
        uptime: '99.99%',
        lastBackup: '2025-11-25T10:00:00Z',
        version: '1.0.0'
    };
};

export const fetchTransactionVolume = async () => {
    return {
        daily: 150000,
        weekly: 1000000,
        monthly: 4500000
    };
};
