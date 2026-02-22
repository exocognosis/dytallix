const MERCHANT_ID = '8c30d98e-71cf-4019-9510-3d398f7fd83e';

export class DytallixPayClient {
    private baseUrl: string;

    constructor(baseUrl: string = '/api/dytallixpay/v1') {
        this.baseUrl = baseUrl;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    private post(path: string, data: any) {
        return fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => r.json());
    }

    private get(path: string) {
        return fetch(`${this.baseUrl}${path}`).then(r => r.json());
    }

    private del(path: string) {
        return fetch(`${this.baseUrl}${path}`, { method: 'DELETE' }).then(r => r.json());
    }

    // -- Dytallix Chain --
    /** Query the live Dytallix node for a wallet's on-chain DRT balance */
    async getChainBalance(address: string): Promise<{ address: string; drt: number; nonce: number; raw: any }> {
        // Correct endpoint: GET /account/:addr (proxied via Nginx at /api/blockchain/)
        const res = await fetch(`/api/blockchain/account/${encodeURIComponent(address)}`);
        if (!res.ok) throw new Error('Chain node unreachable');
        const data = await res.json();
        // balances obj uses micro-drt denominations, e.g. { udrt: 1000000, udgt: 500 }
        const udrt = data.balances?.udrt ?? 0;
        const drt = typeof udrt === 'string' ? parseInt(udrt, 10) : Number(udrt);
        return { address: data.address, drt, nonce: data.nonce ?? 0, raw: data };
    }

    // --- Merchants ---
    async getMerchants() {
        return this.get(`/merchants/${MERCHANT_ID}`);
    }

    // --- Events ---
    async getEvents() {
        return this.get('/events');
    }

    // --- Payment Intents ---
    async createIntent(data: any) {
        return this.post('/payment_intents', data);
    }

    async captureIntent(intentId: string, amount?: number) {
        return this.post(`/payment_intents/${intentId}/capture`, { amount_to_capture: amount });
    }

    // --- OnRamp (USD → DRT) ---
    async requestOnrampQuote(data: { fiat_currency?: string; fiat_amount: number }) {
        return this.post('/onramp/quote', data);
    }

    async initiateOnRamp(data: {
        merchantId: string;
        walletAddressId: string;
        fiatAmount: number;
        fiatCurrency?: string;
    }) {
        return this.post('/onramp/initiate', data);
    }

    async getOnRampTransactions(merchantId: string) {
        return this.get(`/onramp/transactions/${merchantId}`);
    }

    async checkoutOnramp(data: any) {
        return this.post('/onramp/checkout', data);
    }

    // --- OffRamp (DRT → USD) ---
    async requestOfframpQuote(data: { drt_amount: number; target_fiat_currency?: string }) {
        return this.post('/offramp/quote', data);
    }

    async initiateOffRamp(data: {
        merchantId: string;
        bankAccountId: string;
        drtAmount: number;
        targetFiatCurrency?: string;
    }) {
        return this.post('/offramp/initiate', data);
    }

    async getOffRampTransactions(merchantId: string) {
        return this.get(`/offramp/transactions/${merchantId}`);
    }

    // --- Bank Accounts ---
    async saveBankAccount(data: {
        merchantId: string;
        accountHolder: string;
        routingNumber: string;
        accountNumber: string;
        bankName?: string;
        accountType?: string;
    }) {
        return this.post('/bank-accounts', data);
    }

    async getBankAccounts(merchantId: string) {
        return this.get(`/bank-accounts/${merchantId}`);
    }

    async deleteBankAccount(id: string) {
        return this.del(`/bank-accounts/${id}`);
    }

    // --- Wallet Addresses ---
    async saveWallet(data: {
        merchantId: string;
        address: string;
        alias?: string;
    }) {
        return this.post('/wallets', data);
    }

    async getWallets(merchantId: string) {
        return this.get(`/wallets/${merchantId}`);
    }

    async deleteWallet(id: string) {
        return this.del(`/wallets/${id}`);
    }
}

export const sdk = new DytallixPayClient();
export const DEFAULT_MERCHANT_ID = MERCHANT_ID;
