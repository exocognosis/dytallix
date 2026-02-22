import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

export default async function eventsRoutes(fastify: FastifyInstance) {
    fastify.get('/', async (request: any, reply) => {
        const { merchantId } = request.query;

        const events = await prisma.event.findMany({
            where: merchantId ? {
                paymentIntent: {
                    merchantId
                }
            } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return events;
    });

    fastify.post('/webhooks/test', async (request: any, reply) => {
        const { endpointId, eventType } = request.body;
        const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
        if (!endpoint) return reply.code(404).send({ error: "Endpoint not found" });

        // Mock sending webhook (just return success)
        return { success: true, message: `Dispatched test event ${eventType} to ${endpoint.url}` };
    });
}
