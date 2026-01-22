/**
 * Integration Tests - API Status Routes
 * Tests for server/routes/api-status.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// We'll test against the running server
const BASE_URL = 'http://localhost:3001';

describe('API Status Routes - Integration', () => {
    describe('GET /api/status', () => {
        it('should return healthy status', async () => {
            const response = await request(BASE_URL)
                .get('/api/status')
                .expect(200);

            expect(response.body).toHaveProperty('ok');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('network');
            expect(response.body.ok).toBe(true);
        });

        it('should include metrics', async () => {
            const response = await request(BASE_URL)
                .get('/api/status')
                .expect(200);

            expect(response.body).toHaveProperty('metrics');
            expect(response.body.metrics).toHaveProperty('tps');
            expect(response.body.metrics).toHaveProperty('avgLatency');
        });

        it('should include uptime', async () => {
            const response = await request(BASE_URL)
                .get('/api/status')
                .expect(200);

            expect(response.body).toHaveProperty('uptime');
            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
        });
    });

    describe('GET /metrics', () => {
        it('should return Prometheus metrics', async () => {
            const response = await request(BASE_URL)
                .get('/metrics')
                .expect(200);

            expect(response.text).toContain('# HELP');
            expect(response.text).toContain('# TYPE');
        });

        it('should include process metrics', async () => {
            const response = await request(BASE_URL)
                .get('/metrics')
                .expect(200);

            expect(response.text).toContain('process_cpu');
            expect(response.text).toContain('process_resident_memory_bytes');
        });
    });
});
