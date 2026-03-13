import { useState } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { GlassPanel, Button } from '@dytallixpay/ui';
import { CheckCircle2, ArrowRight } from 'lucide-react';

function CheckoutForm() {
    const [amount, setAmount] = useState('100');
    const [status, setStatus] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const handleCheckout = async () => {
        setIsProcessing(true);
        setStatus('Creating intent...');
        try {
            // 1. Create Intent mock
            await new Promise(r => setTimeout(r, 600));
            setStatus(`Intent created. Requesting USD quote...`);

            // 2. Request quote mock
            await new Promise(r => setTimeout(r, 600));
            setStatus(`Quote received. Initiating Sandbox Checkout...`);

            // 3. Checkout Simulation redirect
            await new Promise(r => setTimeout(r, 800));

            // Generate mock transaction data to pass in state
            const mockTxId = `tx_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
            const date = new Date().toLocaleString();
            const fiatAmount = (Number(amount) / 10).toFixed(2); // Mock exchange rate

            // Instead of full href redirect which breaks the SPA, use react-router
            navigate('/test-checkout/success', {
                state: {
                    txId: mockTxId,
                    date,
                    drtAmount: amount,
                    fiatAmount: fiatAmount,
                    status: 'Completed'
                }
            });

        } catch (e: any) {
            setStatus(`Error: ${e.message}`);
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12 animate-fade-in">
            <GlassPanel className="p-8 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Sandbox Checkout</h1>
                    <p className="text-muted-foreground">Simulate a customer paying with Fiat</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Amount (DRT)</label>
                        <input
                            type="number"
                            className="glass-input w-full text-lg p-3"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isProcessing}
                        />
                        <p className="text-xs text-muted-foreground mt-2">≈ ${(Number(amount) / 10).toFixed(2)} USD</p>
                    </div>

                    <Button onClick={handleCheckout} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 shadow-lg shadow-blue-500/20">
                        {isProcessing ? 'Processing Simulation...' : 'Pay with Card (Simulated)'}
                    </Button>

                    {status && (
                        <div className="p-4 bg-white/5 rounded-lg border border-border">
                            <p className="font-mono text-sm text-purple-300 animate-pulse">{status}</p>
                        </div>
                    )}
                </div>
            </GlassPanel>
        </div>
    );
}

function SuccessView() {
    const location = useLocation();
    const navigate = useNavigate();

    // Fallback data if accessed directly without state
    const data = location.state || {
        txId: `tx_simulated_${Date.now()}`,
        date: new Date().toLocaleString(),
        drtAmount: '100',
        fiatAmount: '10.00',
        status: 'Completed'
    };

    return (
        <div className="max-w-xl mx-auto py-12 animate-fade-in">
            <GlassPanel className="p-8 space-y-8 text-center border-emerald-500/30 bg-emerald-500/5">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-emerald-400">Transaction Completed</h1>
                    <p className="text-muted-foreground">Your simulated test payment was successful.</p>
                </div>

                <div className="bg-background/50 rounded-xl p-6 text-left space-y-4 border border-border">
                    <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <span className="text-muted-foreground">Transaction ID</span>
                        <span className="font-mono text-sm truncate max-w-[200px]">{data.txId}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <span className="text-muted-foreground">Date</span>
                        <span className="text-sm">{data.date}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded-md text-sm">{data.status}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground font-medium">Total Paid</span>
                        <div className="text-right">
                            <p className="text-2xl font-bold">${data.fiatAmount} USD</p>
                            <p className="text-purple-400 font-medium text-sm">for {data.drtAmount} DRT</p>
                        </div>
                    </div>
                </div>

                <Button onClick={() => navigate('/test-checkout')} variant="outline" className="w-full">
                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Return to Checkout
                </Button>
            </GlassPanel>
        </div>
    );
}

export default function TestCheckout() {
    return (
        <Routes>
            <Route path="/" element={<CheckoutForm />} />
            <Route path="/success" element={<SuccessView />} />
        </Routes>
    );
}
