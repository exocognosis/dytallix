import {
    DytallixPayEventTypes,
    PaymentIntentCreatedEvent,
    PaymentIntentAuthorizedEvent,
    PaymentIntentCapturedEvent,
    PayoutInitiatedEvent
} from './types';

export class MockContractRunner {
    private events: any[] = [];
    private currentBlock = 1000;

    constructor() { }

    async createIntent(intentId: string, merchantId: string, amount: number) {
        this.currentBlock++;
        this.events.push({
            type: DytallixPayEventTypes.INTENT_CREATED,
            payload: {
                txHash: `tx_${Date.now()}`,
                blockHeight: this.currentBlock,
                timestamp: Date.now(),
                intentId,
                merchantId,
                amount,
                currency: 'DRT'
            } as PaymentIntentCreatedEvent
        });
        return 'tx_' + Date.now();
    }

    async authorizeIntent(intentId: string, merchantId: string) {
        this.currentBlock++;
        this.events.push({
            type: DytallixPayEventTypes.INTENT_AUTHORIZED,
            payload: {
                txHash: `tx_${Date.now()}`,
                blockHeight: this.currentBlock,
                timestamp: Date.now(),
                intentId,
                merchantId,
            } as PaymentIntentAuthorizedEvent
        });
        return 'tx_' + Date.now();
    }

    async captureIntent(intentId: string, merchantId: string, amount: number) {
        this.currentBlock++;
        this.events.push({
            type: DytallixPayEventTypes.INTENT_CAPTURED,
            payload: {
                txHash: `tx_${Date.now()}`,
                blockHeight: this.currentBlock,
                timestamp: Date.now(),
                intentId,
                merchantId,
                amountCaptured: amount
            } as PaymentIntentCapturedEvent
        });
        return 'tx_' + Date.now();
    }

    async initiatePayout(payoutId: string, merchantId: string, destination: string, amount: number) {
        this.currentBlock++;
        this.events.push({
            type: DytallixPayEventTypes.PAYOUT_INITIATED,
            payload: {
                txHash: `tx_${Date.now()}`,
                blockHeight: this.currentBlock,
                timestamp: Date.now(),
                payoutId,
                merchantId,
                destination,
                amount
            } as PayoutInitiatedEvent
        });
        return 'tx_' + Date.now();
    }

    pollEvents(fromBlock: number) {
        return this.events.filter(e => e.payload.blockHeight >= fromBlock);
    }
}

export const mockContract = new MockContractRunner();
