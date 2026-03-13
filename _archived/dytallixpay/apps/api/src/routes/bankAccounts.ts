import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

export default async function bankAccountRoutes(fastify: FastifyInstance) {
    // Save a bank account for a merchant
    fastify.post('/', async (request: any, reply) => {
        const { merchantId, accountHolder, routingNumber, accountNumber, bankName, accountType } = request.body;

        if (!merchantId || !accountHolder || !routingNumber || !accountNumber) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        // Mask account number for storage display (keep last 4 digits)
        const maskedAccount = `••••${accountNumber.slice(-4)}`;

        const acct = await (prisma as any).bankAccount.create({
            data: {
                merchantId,
                accountHolder,
                routingNumber,
                accountNumber: maskedAccount,
                bankName: bankName || null,
                accountType: accountType || 'checking'
            }
        });

        return acct;
    });

    // Get all bank accounts for a merchant
    fastify.get('/:merchantId', async (request: any) => {
        const { merchantId } = request.params;
        return (prisma as any).bankAccount.findMany({
            where: { merchantId },
            orderBy: { createdAt: 'desc' }
        });
    });

    // Delete a bank account
    fastify.delete('/:id', async (request: any, reply) => {
        const { id } = request.params;
        await (prisma as any).bankAccount.delete({ where: { id } });
        return { success: true };
    });
}
