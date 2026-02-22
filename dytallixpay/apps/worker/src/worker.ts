import { prisma } from '@dytallixpay/db';
import { mockContract } from '@dytallixpay/contracts';

// In a real system, this would use BullMQ + Redis to listen to "onramp.succeeded" queues
// For local execution w/o Docker, we poll the DB for pending intents & payouts

const WORKER_INTERVAL_MS = 5000;

async function processPendingSettlements() {
    try {
        // 1. Find payment intents that are stuck in REQUIRES_PAYMENT_METHOD 
        // and older than 10 seconds (simulating user completed onramp checkout)
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        const pendingIntents = await prisma.paymentIntent.findMany({
            where: {
                status: 'REQUIRES_PAYMENT_METHOD',
                createdAt: { lt: tenSecondsAgo }
            }
        });

        for (const intent of pendingIntents) {
            console.log(`[Worker] Simulating onramp success for Intent ${intent.id}. Capturing...`);

            await mockContract.authorizeIntent(intent.id, intent.merchantId);

            if (intent.captureMethod === 'automatic') {
                await mockContract.captureIntent(intent.id, intent.merchantId, Number(intent.amount));

                await prisma.paymentIntent.update({
                    where: { id: intent.id },
                    data: { status: 'CAPTURED', capturedAmount: intent.amount }
                });

                const balance = await prisma.balance.findUnique({ where: { merchantId: intent.merchantId } });
                if (balance) {
                    await prisma.balance.update({
                        where: { merchantId: intent.merchantId },
                        data: { available: balance.available + intent.amount }
                    });
                }
            } else {
                await prisma.paymentIntent.update({
                    where: { id: intent.id },
                    data: { status: 'AUTHORIZED' }
                });
            }
        }

        // 2. Offramp / Payouts process (Mock completion)
        const pendingPayouts = await prisma.payout.findMany({
            where: { status: 'PENDING' }
        });

        for (const payout of pendingPayouts) {
            console.log(`[Worker] Processing pending payout ${payout.id}`);
            await prisma.payout.update({
                where: { id: payout.id },
                data: { status: 'COMPLETED' }
            });
        }

    } catch (err) {
        console.error(`[Worker] Error in processing loop`, err);
    }
}

async function startWorker() {
    console.log('[Worker] Starting background settlement worker...');
    setInterval(processPendingSettlements, WORKER_INTERVAL_MS);
}

startWorker().catch(console.error);
