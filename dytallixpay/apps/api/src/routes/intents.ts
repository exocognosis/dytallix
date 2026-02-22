import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';
import { mockContract } from '@dytallixpay/contracts';

export default async function intentsRoutes(fastify: FastifyInstance) {
    fastify.post('/', async (request: any, reply) => {
        const { merchantId, amount, currency = 'DRT', capture_method = 'automatic', metadata, idempotency_key } = request.body;

        if (idempotency_key) {
            const existing = await prisma.paymentIntent.findUnique({
                where: { idempotencyKey: idempotency_key }
            });
            if (existing) return existing;
        }

        const intent = await prisma.paymentIntent.create({
            data: {
                merchantId,
                amount: BigInt(amount),
                currency,
                captureMethod: capture_method,
                status: 'REQUIRES_PAYMENT_METHOD',
                metadata: metadata ? JSON.stringify(metadata) : null,
                idempotencyKey: idempotency_key
            }
        });

        // Fire Mock Contract Event
        await mockContract.createIntent(intent.id, merchantId, Number(amount));

        return intent;
    });

    fastify.get('/:intentId', async (request: any, reply) => {
        const { intentId } = request.params;
        return await prisma.paymentIntent.findUnique({
            where: { id: intentId },
            include: { events: true }
        });
    });

    fastify.post('/:intentId/capture', async (request: any, reply) => {
        const { intentId } = request.params;
        const { amount_to_capture } = request.body || {};

        let intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
        if (!intent) return reply.code(404).send({ error: "Intent not found" });

        if (intent.status !== 'AUTHORIZED' && intent.status !== 'REQUIRES_PAYMENT_METHOD') {
            return reply.code(400).send({ error: `Cannot capture intent in status ${intent.status}` });
        }

        const capAmount = amount_to_capture ? BigInt(amount_to_capture) : intent.amount;

        await mockContract.captureIntent(intent.id, intent.merchantId, Number(capAmount));

        intent = await prisma.paymentIntent.update({
            where: { id: intentId },
            data: {
                status: 'CAPTURED',
                capturedAmount: capAmount
            }
        });

        // Update merchant balance implicitly (sandbox behavior)
        const balance = await prisma.balance.findUnique({ where: { merchantId: intent.merchantId } });
        if (balance) {
            await prisma.balance.update({
                where: { merchantId: intent.merchantId },
                data: {
                    available: balance.available + capAmount
                }
            });
        }

        return intent;
    });

    fastify.post('/:intentId/cancel', async (request: any, reply) => {
        const { intentId } = request.params;
        const intent = await prisma.paymentIntent.update({
            where: { id: intentId },
            data: { status: 'CANCELED' }
        });
        return intent;
    });
}
