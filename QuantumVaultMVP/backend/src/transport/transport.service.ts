import { Injectable } from '@nestjs/common';

@Injectable()
export class TransportService {
    getSessions() {
        return {
            pqcSessions: 847,
            hybridTunnels: 156,
            protectedTraffic: 94.5,
            vulnerableTraffic: 5.5,
        };
    }

    getTunnels() {
        return [
            { id: 'tunnel-1', name: 'Primary DC Link', protocol: 'TLS 1.3 + ML-KEM', status: 'active', bandwidth: '10 Gbps' },
            { id: 'tunnel-2', name: 'DR Site Backup', protocol: 'TLS 1.3 + ML-KEM', status: 'active', bandwidth: '5 Gbps' },
            { id: 'tunnel-3', name: 'Partner API Gateway', protocol: 'mTLS + PQC', status: 'active', bandwidth: '1 Gbps' },
            { id: 'tunnel-4', name: 'Cloud Hybrid', protocol: 'IPsec + ML-KEM', status: 'degraded', bandwidth: '2 Gbps' },
        ];
    }

    getTraffic() {
        return [
            { month: 'Jan', protected: 85, vulnerable: 15 },
            { month: 'Feb', protected: 88, vulnerable: 12 },
            { month: 'Mar', protected: 90, vulnerable: 10 },
            { month: 'Apr', protected: 92, vulnerable: 8 },
            { month: 'May', protected: 93, vulnerable: 7 },
            { month: 'Jun', protected: 94.5, vulnerable: 5.5 },
        ];
    }
}
