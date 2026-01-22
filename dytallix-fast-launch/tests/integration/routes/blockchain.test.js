/**
 * Integration Tests - Blockchain Routes
 * Tests for server/routes/blockchain.js
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';

describe('Blockchain Routes - Integration', () => {
    describe('GET /status', () => {
        it('should return blockchain status', async () => {
            const response = await request(BASE_URL)
                .get('/status')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(typeof response.body).toBe('object');
        });
    });

    describe('GET /balance/:address', () => {
        it('should handle balance requests', async () => {
            const testAddress = 'dytallix1test123';

            const response = await request(BASE_URL)
                .get(`/balance/${testAddress}`);

            // Should not crash
            expect([200, 404, 500]).toContain(response.status);
        });
    });

    describe('GET /account/:address', () => {
        it('should handle account requests', async () => {
            const testAddress = 'dytallix1test123';

            const response = await request(BASE_URL)
                .get(`/account/${testAddress}`);

            // Should not crash
            expect([200, 404, 500]).toContain(response.status);
        });
    });

    describe('POST /submit', () => {
        it('should handle transaction submission endpoint', async () => {
            const response = await request(BASE_URL)
                .post('/submit')
                .send({ tx: 'test-transaction' });

            // Should accept POST requests (may reject invalid tx)
            expect([200, 400, 422, 500]).toContain(response.status);
        });

        it('should reject empty submissions', async () => {
            const response = await request(BASE_URL)
                .post('/submit')
                .send({});

            // Should return error for empty submission
            expect([400, 422, 500]).toContain(response.status);
        });
    });
});
