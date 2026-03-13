import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

export default async function merchantsRoutes(fastify: FastifyInstance) {
    fastify.post('/', async (request: any, reply) => {
        const { name } = request.body;
        const merchant = await prisma.merchant.create({
            data: {
                name,
                balances: {
                    create: {
                        currency: 'DRT',
                        available: 0n,
                        pending: 0n
                    }
                }
            }
        });
        return merchant;
    });

    fastify.get('/:merchantId', async (request: any, reply) => {
        const { merchantId } = request.params;
        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId }
        });
        return merchant;
    });

    fastify.get('/:merchantId/balance', async (request: any, reply) => {
        const { merchantId } = request.params;
        const balance = await prisma.balance.findUnique({
            where: { merchantId }
        });
        return balance;
    });

    fastify.post('/:merchantId/webhook_endpoints', async (request: any, reply) => {
        const { merchantId } = request.params;
        const { url, events } = request.body;

        // SQLite stores string array as JSON string
        const endpoint = await prisma.webhookEndpoint.create({
            data: {
                merchantId,
                url,
                events: JSON.stringify(events)
            }
        });

        return { ...endpoint, events: JSON.parse(endpoint.events) };
    });

    fastify.get('/:merchantId/webhook_endpoints', async (request: any, reply) => {
        const { merchantId } = request.params;
        const endpoints = await prisma.webhookEndpoint.findMany({
            where: { merchantId }
        });

        return endpoints.map(ep => ({ ...ep, events: JSON.parse(ep.events) }));
    });
}
