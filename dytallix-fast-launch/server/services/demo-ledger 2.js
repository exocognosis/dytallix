/**
 * Demo Ledger Service
 * In-memory balance tracking for demo mode when blockchain is not available
 */

const demoLedger = new Map(); // address -> { udgt: number, udrt: number }

/**
 * Credit tokens to an address in demo mode
 */
export function creditDemo(address, symbol, amountBase) {
    try {
        const den = symbol === 'DGT' ? 'udgt' : symbol === 'DRT' ? 'udrt' : String(symbol || '').toLowerCase();
        const key = String(address || '').trim();
        if (!key) return;

        const rec = demoLedger.get(key) || { udgt: 0, udrt: 0 };
        rec[den] = (Number(rec[den]) || 0) + Number(amountBase || 0);
        demoLedger.set(key, rec);
    } catch {
        /* ignore errors */
    }
}

/**
 * Get demo balances for an address
 */
export function getDemoBalances(address) {
    const key = String(address || '').trim();
    return key ? demoLedger.get(key) || null : null;
}

/**
 * Clear all demo balances (for testing)
 */
export function clearDemoLedger() {
    demoLedger.clear();
}
