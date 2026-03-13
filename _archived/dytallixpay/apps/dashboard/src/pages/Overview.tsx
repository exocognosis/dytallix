import { useEffect, useState } from 'react';
import { sdk } from '@dytallixpay/sdk';
import { GlassPanel } from '@dytallixpay/ui';
import { Activity, DollarSign, RefreshCw } from 'lucide-react';

export default function Overview() {
    const [balance, setBalance] = useState<any>(null);

    useEffect(() => {
        // Usually fetches /merchants/:id/balance but we use a mocked flow here
        sdk.getMerchants().then(data => {
            if (data && data.balances && data.balances.length > 0) {
                setBalance(data.balances[0]);
            }
        }).catch(console.error);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground mt-2">Monitor your payments, payouts, and overall platform health.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassPanel className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold">{balance ? (Number(balance.available) / 100).toFixed(2) : '0.00'}</p>
                                <span className="text-xl font-semibold text-muted-foreground">DRT</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Pending Settlements</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold">{balance ? (Number(balance.pending) / 100).toFixed(2) : '0.00'}</p>
                                <span className="text-xl font-semibold text-muted-foreground">DRT</span>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">System Status</p>
                            <p className="text-2xl font-bold text-emerald-500 flex items-center gap-2 mt-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                Operational
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                </GlassPanel>
            </div>

            <GlassPanel className="p-6 min-h-[400px]">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Recent Network Events
                </h3>
                <EventFeed />
            </GlassPanel>
        </div>
    );
}

function EventFeed() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        sdk.getEvents().then(setEvents).catch(console.error);
        const id = setInterval(() => {
            sdk.getEvents().then(setEvents).catch(console.error);
        }, 5000);
        return () => clearInterval(id);
    }, []);

    if (events.length === 0) return <div className="text-muted-foreground text-sm italic">No recent events.</div>;

    return (
        <div className="space-y-4">
            {events.map((ev, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                    <div>
                        <p className="font-mono text-sm font-medium">{ev.type}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[500px] mt-1">{ev.payload}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                </div>
            ))}
        </div>
    );
}
