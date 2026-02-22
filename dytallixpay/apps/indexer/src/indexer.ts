import { prisma } from '@dytallixpay/db';
import { mockContract, DytallixPayEventTypes } from '@dytallixpay/contracts';

const POLL_INTERVAL_MS = 3000;
let lastPolledBlock = 1000;

async function processEvent(event: any) {
    const { type, payload } = event;

    // Persist canonical event
    await prisma.event.create({
        data: {
            type,
            payload: JSON.stringify(payload),
            paymentIntentId: ['payment_intent_created', 'payment_intent_authorized', 'payment_intent_captured', 'payment_intent_refunded'].includes(type) ? payload.intentId : null
        }
    });

    // Reconcile/update views based on events
    if (type === DytallixPayEventTypes.INTENT_AUTHORIZED) {
        await prisma.paymentIntent.update({
            where: { id: payload.intentId },
            data: { status: 'AUTHORIZED' }
        });
    }

    if (type === DytallixPayEventTypes.INTENT_CAPTURED) {
        const intent = await prisma.paymentIntent.findUnique({ where: { id: payload.intentId } });
        if (intent && intent.status !== 'CAPTURED') {
            await prisma.paymentIntent.update({
                where: { id: payload.intentId },
                data: { status: 'CAPTURED', capturedAmount: BigInt(payload.amountCaptured) }
            });
        }
    }

    console.log(`[Indexer] Processed event ${type} at block ${payload.blockHeight}`);
}

async function runIndexer() {
    console.log('[Indexer] Started polling Dytallix chain operations...');
    setInterval(async () => {
        try {
            const newEvents = mockContract.pollEvents(lastPolledBlock + 1);

            for (const event of newEvents) {
                await processEvent(event);
                lastPolledBlock = Math.max(lastPolledBlock, event.payload.blockHeight);
            }
        } catch (e) {
            console.error('[Indexer] Error polling events:', e);
        }
    }, POLL_INTERVAL_MS);
}

runIndexer().catch(console.error);
