import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

export default async function authRoutes(fastify: FastifyInstance) {
    // Mock login: Dashboard operator auth
    fastify.post('/login', async (request, reply) => {
        return { token: 'mock-jwt-token' };
    });

    fastify.get('/me', async (request, reply) => {
        return { user: { id: 'admin', role: 'operator' } };
    });

    // Create Merchant API Key
    fastify.post('/api-keys', async (request: any, reply) => {
        const { merchantId, name } = request.body;

        // In production we would hash the key securely.
        const rawKey = `sk_test_${Math.random().toString(36).substring(2, 15)}`;

        await prisma.apiKey.create({
            data: {
                merchantId,
                name: name || 'API Key',
                keyHash: rawKey, // Simplified for mock
            }
        });

        return { apiKey: rawKey };
    });
}
