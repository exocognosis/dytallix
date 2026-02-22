import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

const USD_PER_DRT = 0.01; // Mock exchange rate: 100 DRT = 1 USD

export default async function offrampRoutes(fastify: FastifyInstance) {
    // Get a quote for DRT → USD conversion
    fastify.post('/quote', async (request: any) => {
        const { drt_amount, target_fiat_currency = 'USD' } = request.body;
        const rate = target_fiat_currency === 'USD' ? USD_PER_DRT : USD_PER_DRT * 0.95;
        const fees_drt = 50; // flat 50 DRT fee
        const net = Math.max(0, drt_amount - fees_drt);

        return {
            quote_id: `q_off_${Date.now()}`,
            rate,
            fiat_amount_est: parseFloat((net * rate).toFixed(2)),
            fees_drt,
            expires_at: Date.now() + 15 * 60 * 1000
        };
    });

    // Initiate a DRT → USD off-ramp linked to a bank account
    fastify.post('/initiate', async (request: any, reply) => {
        const { merchantId, bankAccountId, drtAmount, targetFiatCurrency = 'USD' } = request.body;

        if (!merchantId || !bankAccountId || !drtAmount) {
            return reply.status(400).send({ error: 'Missing required fields: merchantId, bankAccountId, drtAmount' });
        }

        // Verify bank account exists
        const bankAccount = await (prisma as any).bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!bankAccount) return reply.status(404).send({ error: 'Bank account not found' });

        // Check merchant balance
        const balance = await prisma.balance.findFirst({ where: { merchantId } });
        const drtAmountBig = BigInt(drtAmount);
        if (!balance || balance.available < drtAmountBig) {
            return reply.status(400).send({ error: 'Insufficient DRT balance' });
        }

        const rate = targetFiatCurrency === 'USD' ? USD_PER_DRT : USD_PER_DRT * 0.95;
        const fees = 50; // 50 DRT flat fee
        const netDrt = Math.max(0, drtAmount - fees);
        const fiatAmount = parseFloat((netDrt * rate).toFixed(2));
        const mockTxHash = `0xburn_${Date.now().toString(16)}`;

        // Deduct from balance
        await prisma.balance.update({
            where: { id: balance.id },
            data: { available: { decrement: drtAmountBig } }
        });

        // Create off-ramp transaction record
        const txn = await (prisma as any).offRampTransaction.create({
            data: {
                merchantId,
                bankAccountId,
                drtAmount: drtAmountBig,
                fiatAmount,
                rate,
                fees: fees * rate,
                status: 'COMPLETED',
                txHash: mockTxHash,
            },
            include: { bankAccount: true }
        });

        // Log event
        await (prisma as any).event.create({
            data: {
                type: 'offramp.completed',
                payload: JSON.stringify({
                    txHash: mockTxHash,
                    drtAmount: drtAmountBig.toString(),
                    fiatAmount,
                    bank: bankAccount.accountNumber,
                    accountHolder: bankAccount.accountHolder
                })
            }
        });

        return {
            ...txn,
            drtAmount: txn.drtAmount.toString(),
            message: `Successfully credited $${fiatAmount} USD to ${bankAccount.accountHolder}'s account ${bankAccount.accountNumber}`
        };
    });

    // Legacy create endpoint
    fastify.post('/create', async (request: any, reply) => {
        const { merchant_id, drt_amount, payout_destination } = request.body;
        const balance = await prisma.balance.findUnique({ where: { merchantId: merchant_id } });
        if (!balance || balance.available < BigInt(drt_amount)) {
            return reply.code(400).send({ error: 'Insufficient funds for offramp' });
        }
        await prisma.balance.update({
            where: { merchantId: merchant_id },
            data: { available: balance.available - BigInt(drt_amount) }
        });
        const payout = await prisma.payout.create({
            data: {
                merchantId: merchant_id,
                amount: BigInt(drt_amount),
                destination: payout_destination,
                status: 'PENDING',
                description: 'Fiat Offramp'
            }
        });
        await prisma.payout.update({ where: { id: payout.id }, data: { status: 'COMPLETED' } });
        return payout;
    });

    // List off-ramp transactions for a merchant
    fastify.get('/transactions/:merchantId', async (request: any) => {
        const { merchantId } = request.params;
        const txns = await (prisma as any).offRampTransaction.findMany({
            where: { merchantId },
            include: { bankAccount: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return txns.map((t: any) => ({ ...t, drtAmount: t.drtAmount.toString() }));
    });
}
