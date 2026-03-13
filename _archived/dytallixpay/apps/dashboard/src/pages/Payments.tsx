import { useEffect, useState } from 'react';
import { GlassPanel } from '@dytallixpay/ui';
import { sdk } from '@dytallixpay/sdk';

export default function Payments() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        sdk.getEvents().then(data => {
            // Filter only intent events for mock Payments view
            setEvents(data.filter((e: any) => e.type.startsWith('payment_intent')));
        }).catch(console.error);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                    <p className="text-muted-foreground mt-2">View all payment intents and their statuses.</p>
                </div>
            </div>

            <GlassPanel className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-black/5 dark:bg-white/5 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium">Intent ID</th>
                                <th className="px-6 py-4 font-medium">Event Type</th>
                                <th className="px-6 py-4 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((ev, i) => {
                                const payload = JSON.parse(ev.payload);
                                return (
                                    <tr key={i} className="border-b border-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{payload.intentId}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium 
                        ${ev.type.includes('created') ? 'bg-blue-500/10 text-blue-500' :
                                                    ev.type.includes('authorized') ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-emerald-500/10 text-emerald-500'}`}>
                                                {ev.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {new Date(ev.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                )
                            })}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                        No payments found. Create one using the Test Checkout.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>
        </div>
    );
}
