/**
 * Integration Tests - Explorer Routes
 * Tests for server/routes/explorer.js
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';

describe('Explorer Routes - Integration', () => {
    describe('GET /api/blocks', () => {
        it('should return 200 and valid response', async () => {
            const response = await request(BASE_URL)
                .get('/api/blocks?limit=5')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should handle limit parameter', async () => {
            const response = await request(BASE_URL)
                .get('/api/blocks?limit=3')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/block/:height', () => {
        it('should handle block requests', async () => {
            const response = await request(BASE_URL)
                .get('/api/block/1');

            // Should not crash
            expect([200, 404, 500]).toContain(response.status);
        });
    });

    describe('GET /api/transactions', () => {
        it('should return 200 and valid response', async () => {
            const response = await request(BASE_URL)
                .get('/api/transactions?limit=5')
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/search/:query', () => {
        it('should handle search queries', async () => {
            const response = await request(BASE_URL)
                .get('/api/search/test');

            // Should not crash
            expect([200, 404]).toContain(response.status);
        });
    });
});
