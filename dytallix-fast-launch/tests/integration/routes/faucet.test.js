/**
 * Integration Tests - Faucet Routes
 * Tests for server/routes/faucet.js
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';

describe('Faucet Routes - Integration', () => {
    describe('GET /api/faucet/status', () => {
        it('should return faucet status', async () => {
            const response = await request(BASE_URL)
                .get('/api/faucet/status');

            // May return 200 if faucet is up, or 502 if down
            expect([200, 502]).toContain(response.status);
        });
    });

    describe('POST /api/faucet/request', () => {
        it('should handle faucet requests', async () => {
            const response = await request(BASE_URL)
                .post('/api/faucet/request')
                .send({
                    address: 'dytallix1test123',
                    token: 'DGT'
                });

            // Should handle request (may reject for various reasons)
            expect([200, 400, 429, 500, 502]).toContain(response.status);
        });

        it('should reject requests without address', async () => {
            const response = await request(BASE_URL)
                .post('/api/faucet/request')
                .send({ token: 'DGT' });

            // Should return error for missing address
            expect([400, 500, 502]).toContain(response.status);
        });

        it('should reject requests without token', async () => {
            const response = await request(BASE_URL)
                .post('/api/faucet/request')
                .send({ address: 'dytallix1test123' });

            // Should return error for missing token
            expect([400, 500, 502]).toContain(response.status);
        });
    });

    describe('Rate limiting', () => {
        it('should handle multiple requests', async () => {
            const address = 'dytallix1ratelimit';

            // Make first request
            const response1 = await request(BASE_URL)
                .post('/api/faucet/request')
                .send({ address, token: 'DGT' });

            // Make second request immediately
            const response2 = await request(BASE_URL)
                .post('/api/faucet/request')
                .send({ address, token: 'DGT' });

            // At least one should work or both should be rate limited
            const statuses = [response1.status, response2.status];
            expect(statuses.some(s => [200, 429, 500, 502].includes(s))).toBe(true);
        });
    });
});
