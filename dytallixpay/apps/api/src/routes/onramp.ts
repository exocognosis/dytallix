import { FastifyInstance } from 'fastify';
import { prisma } from '@dytallixpay/db';

const DRT_PER_USD = 100; // Mock exchange rate: 1 USD = 100 DRT base units

export default async function onrampRoutes(fastify: FastifyInstance) {
    // Get a quote for USD → DRT conversion
    fastify.post('/quote', async (request: any) => {
        const { fiat_currency = 'USD', fiat_amount } = request.body;
        const rate = fiat_currency === 'USD' ? DRT_PER_USD : 90;
        const fees = parseFloat((fiat_amount * 0.015).toFixed(2)); // 1.5% fee
        const drt_amount_est = Math.floor((fiat_amount - fees) * rate);

        return {
            quote_id: `q_on_${Date.now()}`,
            rate,
            fees,
            drt_amount_est,
            expires_at: Date.now() + 15 * 60 * 1000
        };
    });

    // Initiate USD → DRT on-ramp (ACH debit + DRT mint to wallet)
    fastify.post('/initiate', async (request: any, reply) => {
        const { merchantId, walletAddressId, fiatAmount, fiatCurrency = 'USD' } = request.body;

        if (!merchantId || !walletAddressId || !fiatAmount) {
            return reply.status(400).send({ error: 'Missing required fields: merchantId, walletAddressId, fiatAmount' });
        }

        const wallet = await (prisma as any).walletAddress.findUnique({ where: { id: walletAddressId } });
        if (!wallet) return reply.status(404).send({ error: 'Wallet address not found' });

        const rate = fiatCurrency === 'USD' ? DRT_PER_USD : 90;
        const fees = parseFloat((fiatAmount * 0.015).toFixed(2));
        const drtAmount = BigInt(Math.floor((fiatAmount - fees) * rate));
        const mockTxHash = `0xmint_${Date.now().toString(16)}`;

        const txn = await (prisma as any).onRampTransaction.create({
            data: {
                merchantId,
                walletAddressId,
                fiatAmount,
                drtAmount,
                rate,
                fees,
                status: 'COMPLETED',
                txHash: mockTxHash,
            },
            include: { walletAddress: true }
        });

        // Update merchant balance
        const existing = await (prisma as any).balance.findFirst({ where: { merchantId } });
        if (existing) {
            await (prisma as any).balance.update({
                where: { id: existing.id },
                data: { available: { increment: drtAmount } }
            });
        }

        await (prisma as any).event.create({
            data: {
                type: 'onramp.completed',
                payload: JSON.stringify({ txHash: mockTxHash, drtAmount: drtAmount.toString(), wallet: wallet.address, fiatAmount })
            }
        });

        return {
            ...txn,
            drtAmount: txn.drtAmount.toString(),
            message: `Minted ${drtAmount.toString()} DRT to ${wallet.address}`
        };
    });

    // Legacy checkout (sandbox)
    fastify.post('/checkout', async (request: any) => {
        const { return_url } = request.body;
        const sessionId = `cs_test_${Date.now()}`;
        return {
            session_id: sessionId,
            hosted_page_url: `https://dytallix.com/dytallixpay/checkout/${sessionId}?return=${encodeURIComponent(return_url || '')}`
        };
    });

    fastify.get('/sessions/:sessionId', async (request: any) => {
        const { sessionId } = request.params;
        return { id: sessionId, status: 'complete', payment_status: 'paid' };
    });

    // List on-ramp transactions for a merchant
    fastify.get('/transactions/:merchantId', async (request: any) => {
        const { merchantId } = request.params;
        const txns = await (prisma as any).onRampTransaction.findMany({
            where: { merchantId },
            include: { walletAddress: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return txns.map((t: any) => ({ ...t, drtAmount: t.drtAmount.toString() }));
    });
}
