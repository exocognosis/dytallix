import { useState, useEffect, useCallback } from 'react';
import { GlassPanel, Button } from '@dytallixpay/ui';
import { sdk, DEFAULT_MERCHANT_ID } from '@dytallixpay/sdk';
import { Wallet, Plus, Trash2, ArrowDownToLine, CheckCircle2, Loader2, Search, Activity } from 'lucide-react';

export default function WalletPage() {
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [form, setForm] = useState({ address: '', alias: '' });
    const [buyForm, setBuyForm] = useState({ walletAddressId: '', fiatAmount: '' });
    const [quote, setQuote] = useState<any>(null);
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    // Chain balance lookup
    const [lookupAddress, setLookupAddress] = useState('');
    const [chainBalance, setChainBalance] = useState<{ address: string; drt: number; nonce: number; raw: any } | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const loadData = async () => {
        const [w, t] = await Promise.all([
            sdk.getWallets(DEFAULT_MERCHANT_ID),
            sdk.getOnRampTransactions(DEFAULT_MERCHANT_ID)
        ]);
        if (Array.isArray(w)) setWallets(w);
        if (Array.isArray(t)) setTransactions(t);
    };

    useEffect(() => { loadData(); }, []);

    // Debounced chain balance lookup
    const lookupBalance = useCallback(async (addr: string) => {
        if (!addr || addr.length < 5) { setChainBalance(null); setLookupError(''); return; }
        setLookupLoading(true);
        setLookupError('');
        try {
            const result = await sdk.getChainBalance(addr);
            setChainBalance(result);
        } catch (e: any) {
            setLookupError(e.message || 'Failed to query chain');
            setChainBalance(null);
        } finally {
            setLookupLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => lookupBalance(lookupAddress), 600);
        return () => clearTimeout(t);
    }, [lookupAddress, lookupBalance]);

    const handleAddWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.address) return;
        setStatus({ type: 'loading', message: 'Saving wallet...' });
        try {
            await sdk.saveWallet({ merchantId: DEFAULT_MERCHANT_ID, address: form.address, alias: form.alias });
            setForm({ address: '', alias: '' });
            await loadData();
            setStatus({ type: 'idle', message: '' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    const handleGetQuote = async () => {
        if (!buyForm.fiatAmount) return;
        setStatus({ type: 'loading', message: 'Fetching quote...' });
        const q = await sdk.requestOnrampQuote({ fiat_amount: Number(buyForm.fiatAmount) });
        setQuote(q);
        setStatus({ type: 'idle', message: '' });
    };

    const handleBuyDRT = async () => {
        if (!buyForm.walletAddressId || !buyForm.fiatAmount) return;
        setStatus({ type: 'loading', message: 'Processing USD → DRT...' });
        try {
            const result = await sdk.initiateOnRamp({
                merchantId: DEFAULT_MERCHANT_ID,
                walletAddressId: buyForm.walletAddressId,
                fiatAmount: Number(buyForm.fiatAmount),
            });
            if (result.error) throw new Error(result.error);
            setStatus({ type: 'success', message: result.message || 'Transaction complete!' });
            setQuote(null);
            setBuyForm({ walletAddressId: '', fiatAmount: '' });
            await loadData();
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-400" />
                    Dytallix Wallets
                </h1>
                <p className="text-muted-foreground mt-2">Query on-chain DRT balances, manage wallet addresses, and buy DRT with USD.</p>
            </div>

            {/* Live Chain Balance Lookup */}
            <GlassPanel className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <div>
                        <h2 className="text-lg font-semibold">Live Chain Balance Lookup</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Queries the live Dytallix node (block #{' '}
                            <span className="font-mono text-purple-400">~16,800+</span>)
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-start">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                className="glass-input w-full pl-9 font-mono"
                                placeholder="Enter any Dytallix wallet address..."
                                value={lookupAddress}
                                onChange={e => setLookupAddress(e.target.value)}
                            />
                        </div>
                    </div>
                    {lookupLoading && <Loader2 className="w-5 h-5 text-purple-400 animate-spin mt-2" />}
                </div>

                {chainBalance && (
                    <div className="mt-2 p-5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            <span className="text-xs text-muted-foreground font-mono">Live from Dytallix chain</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-muted-foreground text-sm flex-shrink-0 mr-2">Address</span>
                            <span className="font-mono text-xs text-purple-300 break-all text-right">{chainBalance.address}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground text-sm flex-shrink-0">DRT Balance</span>
                            <div className="flex items-baseline gap-1.5 flex-wrap justify-end">
                                <span className="text-2xl sm:text-4xl font-bold break-all">{(chainBalance.drt / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                <span className="text-base sm:text-lg text-purple-400 font-semibold">DRT</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Nonce</span>
                            <span className="font-mono text-sm">{chainBalance.nonce}</span>
                        </div>
                        {Object.keys(chainBalance.raw.balances || {}).length > 0 && (
                            <div className="border-t border-border/50 pt-3">
                                <p className="text-xs text-muted-foreground mb-2">All token balances:</p>
                                {Object.entries(chainBalance.raw.balances).map(([token, amount]) => {
                                    const label = token.replace(/^u/, '').toUpperCase();
                                    const raw = typeof amount === 'string' ? parseInt(amount, 10) : Number(amount);
                                    const display = (raw / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 });
                                    return (
                                        <div key={token} className="flex justify-between items-center text-sm gap-2">
                                            <span className="font-mono text-muted-foreground flex-shrink-0">{label}</span>
                                            <span className="font-mono font-bold break-all text-right">{display}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {Object.keys(chainBalance.raw.balances || {}).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No token balances found  on-chain for this address. This may be a new or unfunded wallet.</p>
                        )}
                    </div>
                )}

                {lookupError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 font-mono">
                        {lookupError}
                    </div>
                )}
            </GlassPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Wallet */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <Plus className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">Save Wallet Address</h2>
                    </div>
                    <form onSubmit={handleAddWallet} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Dytallix Address *</label>
                            <input
                                className="glass-input w-full font-mono"
                                placeholder="dytallix1abc123xyz..."
                                value={form.address}
                                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Alias (optional)</label>
                            <input
                                className="glass-input w-full"
                                placeholder="e.g. My Main Wallet"
                                value={form.alias}
                                onChange={e => setForm(f => ({ ...f, alias: e.target.value }))}
                            />
                        </div>
                        {status.type !== 'idle' && (
                            <div className={`p-3 rounded-lg text-sm font-mono ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/5 text-muted-foreground'}`}>
                                {status.message}
                            </div>
                        )}
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> Save Wallet
                        </Button>
                    </form>
                </GlassPanel>

                {/* Buy DRT */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-semibold">Buy DRT (USD → DRT)</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Destination Wallet *</label>
                            <select
                                className="glass-input w-full"
                                value={buyForm.walletAddressId}
                                onChange={e => setBuyForm(f => ({ ...f, walletAddressId: e.target.value }))}
                            >
                                <option value="">Select a saved wallet...</option>
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.alias ? `${w.alias} — ` : ''}{w.address.slice(0, 16)}...
                                    </option>
                                ))}
                            </select>
                            {wallets.length === 0 && <p className="text-xs text-muted-foreground mt-1">Save a wallet address first ↑</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (USD) *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <input
                                    type="number" min="1" step="0.01"
                                    className="glass-input w-full pl-7"
                                    placeholder="100.00"
                                    value={buyForm.fiatAmount}
                                    onChange={e => { setQuote(null); setBuyForm(f => ({ ...f, fiatAmount: e.target.value })); }}
                                />
                            </div>
                        </div>
                        {!quote ? (
                            <Button type="button" onClick={handleGetQuote} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!buyForm.fiatAmount}>
                                Get Quote
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-emerald-500/30">
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rate</span><span className="font-mono">1 USD = {quote.rate} DRT</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee (1.5%)</span><span className="font-mono text-amber-400">${quote.fees} USD</span></div>
                                    <div className="flex justify-between font-bold border-t border-border pt-2"><span>You receive</span><span className="text-emerald-400 font-mono">{quote.drt_amount_est.toLocaleString()} DRT</span></div>
                                </div>
                                <Button type="button" onClick={handleBuyDRT} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!buyForm.walletAddressId || status.type === 'loading'}>
                                    {status.type === 'loading' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Confirm Purchase
                                </Button>
                            </div>
                        )}
                        {status.type !== 'idle' && (
                            <div className={`p-3 rounded-lg text-sm font-mono ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/5 text-muted-foreground'}`}>
                                {status.message}
                            </div>
                        )}
                    </div>
                </GlassPanel>
            </div>

            {/* Saved Wallets */}
            <GlassPanel className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Saved Wallets</h2>
                </div>
                {wallets.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic py-4 text-center">No wallets saved yet.</p>
                ) : (
                    <div className="space-y-3">
                        {wallets.map(w => (
                            <div key={w.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-border gap-4">
                                <div className="min-w-0 flex-1">
                                    {w.alias && <p className="font-medium truncate">{w.alias}</p>}
                                    <p className="font-mono text-sm text-muted-foreground truncate">{w.address}</p>
                                    <button
                                        className="text-xs text-purple-400 hover:text-purple-300 mt-1 underline"
                                        onClick={() => setLookupAddress(w.address)}
                                    >
                                        Look up live balance ↑
                                    </button>
                                </div>
                                <Button variant="ghost" size="sm" onClick={async () => { await sdk.deleteWallet(w.id); loadData(); }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </GlassPanel>

            {/* Transaction History */}
            {transactions.length > 0 && (
                <GlassPanel className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-4">USD → DRT History</h2>
                    <div className="space-y-3">
                        {transactions.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-border">
                                <div>
                                    <p className="font-medium text-emerald-400">+{Number(t.drtAmount).toLocaleString()} DRT</p>
                                    <p className="text-sm text-muted-foreground">${t.fiatAmount} USD → {t.walletAddress?.alias || t.walletAddress?.address?.slice(0, 14)}...</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">{t.status}</span>
                                    <p className="text-xs text-muted-foreground mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            )}
        </div>
    );
}
