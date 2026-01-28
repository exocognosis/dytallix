import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageService {
    getMetrics() {
        return {
            totalEncrypted: 15892,
            totalBlocks: 45678,
            envelopeProtected: 12456,
            tenantsActive: 8,
        };
    }

    getTenants() {
        return [
            { name: 'Finance Dept', value: 4500, color: '#00BFFF' },
            { name: 'Healthcare', value: 3200, color: '#1976D2' },
            { name: 'Engineering', value: 2800, color: '#10B981' },
            { name: 'Legal', value: 2100, color: '#8B5CF6' },
            { name: 'HR', value: 1800, color: '#F59E0B' },
            { name: 'Other', value: 1492, color: '#6B7280' },
        ];
    }
}
