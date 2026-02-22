import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';
import { mockContract } from '@dytallixpay/contracts';

export default async function payoutsRoutes(fastify: FastifyInstance) {
    fastify.post('/', async (request: any, reply) => {
        const { merchant_id, amount_drt, destination_d_addr, idempotency_key, description } = request.body;

        if (idempotency_key) {
            const existing = await prisma.payout.findUnique({ where: { idempotencyKey: idempotency_key } });
            if (existing) return existing;
        }

        const balance = await prisma.balance.findUnique({ where: { merchantId: merchant_id } });
        if (!balance || balance.available < BigInt(amount_drt)) {
            return reply.code(400).send({ error: 'Insufficient balance' });
        }

        // Deduct balance
        await prisma.balance.update({
            where: { merchantId: merchant_id },
            data: { available: balance.available - BigInt(amount_drt) }
        });

        const payout = await prisma.payout.create({
            data: {
                merchantId: merchant_id,
                amount: BigInt(amount_drt),
                destination: destination_d_addr,
                status: 'PENDING',
                description,
                idempotencyKey: idempotency_key
            }
        });

        // Call Mock Contract
        const txHash = await mockContract.initiatePayout(payout.id, merchant_id, destination_d_addr, Number(amount_drt));

        await prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'COMPLETED', txHash } // Assuming instantaneous in dev
        });

        return payout;
    });

    fastify.get('/:payoutId', async (request: any, reply) => {
        return await prisma.payout.findUnique({
            where: { id: request.params.payoutId }
        });
    });
}
