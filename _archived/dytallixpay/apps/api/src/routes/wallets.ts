import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

export default async function walletRoutes(fastify: FastifyInstance) {
    // Save a Dytallix wallet address for a merchant
    fastify.post('/', async (request: any, reply) => {
        const { merchantId, address, alias } = request.body;

        if (!merchantId || !address) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        // Basic Dytallix address format validation (dytallix1...)
        if (!address.toLowerCase().startsWith('dytallix1')) {
            return reply.status(400).send({ error: 'Invalid Dytallix address format. Must start with dytallix1...' });
        }

        const wallet = await (prisma as any).walletAddress.create({
            data: {
                merchantId,
                address,
                alias: alias || null,
            }
        });

        return wallet;
    });

    // Get all wallet addresses for a merchant
    fastify.get('/:merchantId', async (request: any) => {
        const { merchantId } = request.params;
        return (prisma as any).walletAddress.findMany({
            where: { merchantId },
            orderBy: { createdAt: 'desc' }
        });
    });

    // Delete a wallet address
    fastify.delete('/:id', async (request: any, reply) => {
        const { id } = request.params;
        await (prisma as any).walletAddress.delete({ where: { id } });
        return { success: true };
    });
}
