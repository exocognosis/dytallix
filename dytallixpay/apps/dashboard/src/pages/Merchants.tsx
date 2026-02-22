import { useEffect, useState } from 'react';
import { sdk } from '@dytallixpay/sdk';
import { GlassPanel, Button } from '@dytallixpay/ui';
import { Store, Key, Link as LinkIcon } from 'lucide-react';

export default function Merchants() {
    const [merchant, setMerchant] = useState<any>(null);

    useEffect(() => {
        sdk.getMerchants().then(setMerchant).catch(console.error);
    }, []);

    if (!merchant) return <div className="animate-pulse flex space-x-4">Loading...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
                    <p className="text-muted-foreground mt-2">Manage your merchant account, API keys, and webhooks.</p>
                </div>
                <Button className="bg-primary text-primary-foreground">
                    Create New Merchant
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <Store className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-semibold">Account Details</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Merchant Name</p>
                            <p className="font-medium text-lg">{merchant.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Merchant ID</p>
                            <p className="font-mono text-sm bg-black/10 dark:bg-white/5 py-1 px-2 rounded mt-1 inline-block">{merchant.id}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Created At</p>
                            <p className="text-sm">{new Date(merchant.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <Key className="w-6 h-6 text-amber-500" />
                            <h2 className="text-xl font-semibold">API Keys</h2>
                        </div>
                        <Button variant="outline" size="sm">Generate New Key</Button>
                    </div>

                    <div className="space-y-4">
                        {/* Mock display */}
                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-medium">Default Test Key</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">sk_test_••••••••••••</p>
                            </div>
                            <Button variant="ghost" size="sm">Revoke</Button>
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6 space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <LinkIcon className="w-6 h-6 text-emerald-500" />
                            <h2 className="text-xl font-semibold">Webhook Endpoints</h2>
                        </div>
                        <Button variant="outline" size="sm">Add Endpoint</Button>
                    </div>

                    <div className="text-center py-8 text-muted-foreground">
                        <p>No webhook endpoints configured yet.</p>
                    </div>
                </GlassPanel>

            </div>
        </div>
    );
}
