import { useState, useEffect } from 'react';
import { GlassPanel, Button } from '@dytallixpay/ui';
import { sdk, DEFAULT_MERCHANT_ID } from '@dytallixpay/sdk';
import { Building2, Plus, Trash2, ArrowUpFromLine, CheckCircle2, Loader2 } from 'lucide-react';

export default function BankingPage() {
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [form, setForm] = useState({ accountHolder: '', routingNumber: '', accountNumber: '', bankName: '', accountType: 'checking' });
    const [cashoutForm, setCashoutForm] = useState({ bankAccountId: '', drtAmount: '' });
    const [quote, setQuote] = useState<any>(null);
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const loadData = async () => {
        const [b, t] = await Promise.all([
            sdk.getBankAccounts(DEFAULT_MERCHANT_ID),
            sdk.getOffRampTransactions(DEFAULT_MERCHANT_ID)
        ]);
        if (Array.isArray(b)) setBankAccounts(b);
        if (Array.isArray(t)) setTransactions(t);
    };

    useEffect(() => { loadData(); }, []);

    const handleAddBank = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Saving bank account...' });
        try {
            await sdk.saveBankAccount({ merchantId: DEFAULT_MERCHANT_ID, ...form });
            setForm({ accountHolder: '', routingNumber: '', accountNumber: '', bankName: '', accountType: 'checking' });
            await loadData();
            setStatus({ type: 'idle', message: '' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    const handleGetQuote = async () => {
        if (!cashoutForm.drtAmount) return;
        setStatus({ type: 'loading', message: 'Fetching cashout quote...' });
        const q = await sdk.requestOfframpQuote({ drt_amount: Number(cashoutForm.drtAmount) });
        setQuote(q);
        setStatus({ type: 'idle', message: '' });
    };

    const handleCashOut = async () => {
        if (!cashoutForm.bankAccountId || !cashoutForm.drtAmount) return;
        setStatus({ type: 'loading', message: 'Processing DRT → USD...' });
        try {
            const result = await sdk.initiateOffRamp({
                merchantId: DEFAULT_MERCHANT_ID,
                bankAccountId: cashoutForm.bankAccountId,
                drtAmount: Number(cashoutForm.drtAmount),
            });
            if (result.error) throw new Error(result.error);
            setStatus({ type: 'success', message: result.message || 'Cashout complete!' });
            setQuote(null);
            setCashoutForm({ bankAccountId: '', drtAmount: '' });
            await loadData();
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-amber-400" />
                    Banking
                </h1>
                <p className="text-muted-foreground mt-2">Manage bank accounts and cash out DRT to USD via ACH.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Bank Account */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <Plus className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-semibold">Link Bank Account</h2>
                    </div>
                    <form onSubmit={handleAddBank} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Holder Name *</label>
                                <input
                                    className="glass-input w-full"
                                    placeholder="Jane Smith"
                                    value={form.accountHolder}
                                    onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Routing Number *</label>
                                <input
                                    className="glass-input w-full font-mono"
                                    placeholder="021000021"
                                    maxLength={9}
                                    value={form.routingNumber}
                                    onChange={e => setForm(f => ({ ...f, routingNumber: e.target.value.replace(/\D/g, '') }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Number *</label>
                                <input
                                    className="glass-input w-full font-mono"
                                    placeholder="123456789"
                                    value={form.accountNumber}
                                    onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Bank Name</label>
                                <input
                                    className="glass-input w-full"
                                    placeholder="Chase, BofA..."
                                    value={form.bankName}
                                    onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Type</label>
                                <select
                                    className="glass-input w-full"
                                    value={form.accountType}
                                    onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}
                                >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                            ⚠️ This is a sandbox environment. No real banking credentials are stored.
                        </div>
                        <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                            <Plus className="w-4 h-4 mr-2" /> Link Account
                        </Button>
                    </form>
                </GlassPanel>

                {/* Cash Out DRT → USD */}
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <ArrowUpFromLine className="w-5 h-5 text-orange-400" />
                        <h2 className="text-lg font-semibold">Cash Out (DRT → USD)</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Destination Bank Account *</label>
                            <select
                                className="glass-input w-full"
                                value={cashoutForm.bankAccountId}
                                onChange={e => setCashoutForm(f => ({ ...f, bankAccountId: e.target.value }))}
                            >
                                <option value="">Select a bank account...</option>
                                {bankAccounts.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.accountHolder} — {b.bankName || b.accountType} {b.accountNumber}
                                    </option>
                                ))}
                            </select>
                            {bankAccounts.length === 0 && <p className="text-xs text-muted-foreground mt-1">Link a bank account first →</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (DRT base units) *</label>
                            <input
                                type="number"
                                min="100"
                                step="1"
                                className="glass-input w-full font-mono"
                                placeholder="10000"
                                value={cashoutForm.drtAmount}
                                onChange={e => { setQuote(null); setCashoutForm(f => ({ ...f, drtAmount: e.target.value })); }}
                            />
                            {cashoutForm.drtAmount && <p className="text-xs text-muted-foreground mt-1">≈ {Number(cashoutForm.drtAmount) / 100} DRT tokens</p>}
                        </div>

                        {!quote ? (
                            <Button
                                type="button"
                                onClick={handleGetQuote}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                                disabled={!cashoutForm.drtAmount}
                            >
                                Get Cashout Quote
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-orange-500/30">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rate</span>
                                        <span className="font-mono">100 DRT = $1.00 USD</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Network Fee</span>
                                        <span className="font-mono text-amber-400">{quote.fees_drt} DRT</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t border-border pt-2">
                                        <span>You receive</span>
                                        <span className="text-orange-400 font-mono">${quote.fiat_amount_est.toFixed(2)} USD</span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleCashOut}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    disabled={!cashoutForm.bankAccountId || status.type === 'loading'}
                                >
                                    {status.type === 'loading' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Confirm Cashout
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

            {/* Saved Bank Accounts */}
            <GlassPanel className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-semibold">Linked Accounts</h2>
                </div>
                {bankAccounts.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic py-4 text-center">No bank accounts linked yet.</p>
                ) : (
                    <div className="space-y-3">
                        {bankAccounts.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-border">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{b.accountHolder}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {b.bankName ? `${b.bankName} · ` : ''}{b.accountType} · {b.accountNumber}
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">Routing: {b.routingNumber}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={async () => { await sdk.deleteBankAccount(b.id); loadData(); }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </GlassPanel>

            {/* Cashout History */}
            {transactions.length > 0 && (
                <GlassPanel className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-4">DRT → USD History</h2>
                    <div className="space-y-3">
                        {transactions.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-border">
                                <div>
                                    <p className="font-medium text-orange-400">-{Number(t.drtAmount).toLocaleString()} DRT</p>
                                    <p className="text-sm text-muted-foreground">+${t.fiatAmount} USD → {t.bankAccount?.accountHolder} {t.bankAccount?.accountNumber}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 font-mono">{t.status}</span>
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
