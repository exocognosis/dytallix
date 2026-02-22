// Dytallix Pay Contract Typings

export type DAddr = string;

export enum DytallixPayEventTypes {
    MERCHANT_REGISTERED = 'merchant_registered',
    INTENT_CREATED = 'payment_intent_created',
    INTENT_AUTHORIZED = 'payment_intent_authorized',
    INTENT_CAPTURED = 'payment_intent_captured',
    INTENT_REFUNDED = 'payment_intent_refunded',
    INTENT_CANCELED = 'payment_intent_canceled',
    BALANCE_DEPOSITED = 'balance_deposited',
    BALANCE_WITHDRAWN = 'balance_withdrawn',
    PAYOUT_INITIATED = 'payout_initiated',
    PAYOUT_COMPLETED = 'payout_completed',
}

export interface BaseEvent {
    txHash: string;
    blockHeight: number;
    timestamp: number;
}

export interface MerchantRegisteredEvent extends BaseEvent {
    merchantId: string;
    ownerAddress: DAddr;
}

export interface PaymentIntentCreatedEvent extends BaseEvent {
    intentId: string;
    merchantId: string;
    amount: number;
    currency: string;
}

export interface PaymentIntentAuthorizedEvent extends BaseEvent {
    intentId: string;
    merchantId: string;
}

export interface PaymentIntentCapturedEvent extends BaseEvent {
    intentId: string;
    merchantId: string;
    amountCaptured: number;
}

export interface PaymentIntentRefundedEvent extends BaseEvent {
    intentId: string;
    merchantId: string;
    amountRefunded: number;
}

export interface PayoutInitiatedEvent extends BaseEvent {
    payoutId: string;
    merchantId: string;
    amount: number;
    destination: DAddr;
}
