/**
 * Aegis Review Queue Dashboard
 * Manual review workflow for high-risk transactions
 */

import React, { useState, useEffect } from 'react';
import { Section } from '../components/layout/section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    AlertTriangle, CheckCircle, XCircle, Clock, Shield, ChevronDown, ChevronUp,
    Activity, Database, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QueuedTransaction {
    id: number;
    tx_hash: string;
    from_address: string;
    to_address: string;
    amount: number;
    risk_score: number;
    confidence: number;
    status: string;
    priority: number;
    priority_label: string;
    expires_at: string;
    created_at: string;
    analysis_data?: any;
}

interface QueueStats {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    critical: number;
    high: number;
    normal: number;
}

const AegisReviewQueue: React.FC = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<QueuedTransaction[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [priorityFilter, setPriorityFilter] = useState<number | null>(null);

    const fetchQueue = async () => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (priorityFilter !== null) params.append('priority', priorityFilter.toString());

            const [queueRes, statsRes] = await Promise.all([
                fetch(`/api/aegis/review/queue?${params}`),
                fetch('/api/aegis/review/stats')
            ]);

            const queueData = await queueRes.json();
            const statsData = await statsRes.json();

            if (queueData.success) {
                setTransactions(queueData.transactions);
            }

            if (statsData.success) {
                setStats(statsData.stats);
            }

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch review queue:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 15000);
        return () => clearInterval(interval);
    }, [filter, priorityFilter]);

    const handleApprove = async (txHash: string) => {
        try {
            const response = await fetch(`/api/aegis/review/${txHash}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewer_id: 'admin', // TODO: Get from auth
                    notes: 'Approved via dashboard'
                })
            });

            if (response.ok) {
                fetchQueue(); // Refresh
            }
        } catch (error) {
            console.error('Failed to approve transaction:', error);
        }
    };

    const handleReject = async (txHash: string) => {
        try {
            const response = await fetch(`/api/aegis/review/${txHash}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewer_id: 'admin', // TODO: Get from auth
                    notes: 'Rejected via dashboard'
                })
            });

            if (response.ok) {
                fetchQueue(); // Refresh
            }
        } catch (error) {
            console.error('Failed to reject transaction:', error);
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority === 2) return 'text-red-500';
        if (priority === 1) return 'text-amber-500';
        return 'text-blue-500';
    };

    const getPriorityBg = (priority: number) => {
        if (priority === 2) return 'bg-red-500/10';
        if (priority === 1) return 'bg-amber-500/10';
        return 'bg-blue-500/10';
    };

    const getPriorityBorder = (priority: number) => {
        if (priority === 2) return 'border-red-500/20';
        if (priority === 1) return 'border-amber-500/20';
        return 'border-blue-500/20';
    };

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date().getTime();
        const expires = new Date(expiresAt).getTime();
        const diff = expires - now;

        if (diff < 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-accent-blue animate-pulse mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Loading Review Queue...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/aegis-dashboard')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back to Dashboard</span>
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-10 h-10 text-accent-blue" />
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                            Review Queue
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Manual review for high-risk transactions requiring approval
                    </p>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <GlassPanel className="p-4" hoverEffect>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pending}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-4" hoverEffect>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Critical</p>
                                    <p className="text-2xl font-bold">{stats.critical}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-4" hoverEffect>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Approved</p>
                                    <p className="text-2xl font-bold">{stats.approved}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-4" hoverEffect>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Rejected</p>
                                    <p className="text-2xl font-bold">{stats.rejected}</p>
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                )}

                {/* Filters */}
                <GlassPanel className="p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Status</label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as any)}
                                className="bg-background border border-border rounded px-3 py-2 text-sm"
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Priority</label>
                            <select
                                value={priorityFilter ?? ''}
                                onChange={(e) => setPriorityFilter(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-background border border-border rounded px-3 py-2 text-sm"
                            >
                                <option value="">All</option>
                                <option value="2">Critical</option>
                                <option value="1">High</option>
                                <option value="0">Normal</option>
                            </select>
                        </div>
                    </div>
                </GlassPanel>

                {/* Queue Table */}
                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold mb-6">Transactions</h2>
                    {transactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No transactions in queue</p>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.tx_hash}
                                    className={`border rounded-lg overflow-hidden transition-all duration-300 hover:border-accent-blue/30 ${getPriorityBorder(tx.priority)}`}
                                >
                                    {/* Main Row */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                                        onClick={() => setExpandedRow(expandedRow === tx.tx_hash ? null : tx.tx_hash)}
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getPriorityBg(tx.priority)} ${getPriorityColor(tx.priority)} ${getPriorityBorder(tx.priority)} border`}>
                                                    {tx.priority_label}
                                                </span>
                                            </div>
                                            <div className="col-span-3">
                                                <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                                                <code className="text-xs font-mono">{tx.tx_hash.slice(0, 16)}...</code>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Risk</p>
                                                <span className={`text-sm font-bold ${tx.risk_score >= 90 ? 'text-red-500' :
                                                        tx.risk_score >= 70 ? 'text-amber-500' :
                                                            'text-green-500'
                                                    }`}>
                                                    {tx.risk_score}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                                                <p className="text-sm font-mono">{tx.amount.toFixed(2)}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Expires In</p>
                                                <p className={`text-sm font-semibold ${getTimeRemaining(tx.expires_at) === 'Expired' ? 'text-red-500' : 'text-foreground'
                                                    }`}>
                                                    {getTimeRemaining(tx.expires_at)}
                                                </p>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-end gap-2">
                                                {tx.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleApprove(tx.tx_hash);
                                                            }}
                                                            className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-xs font-semibold hover:bg-green-500/20 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReject(tx.tx_hash);
                                                            }}
                                                            className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs font-semibold hover:bg-red-500/20 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {expandedRow === tx.tx_hash ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedRow === tx.tx_hash && tx.analysis_data && (
                                        <div className="border-t border-border/30 bg-accent/5 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Risk Breakdown */}
                                                {tx.analysis_data.breakdown && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                                            <Activity className="h-4 w-4 text-accent-blue" />
                                                            Risk Factor Breakdown
                                                        </h4>
                                                        <div className="space-y-3 text-sm">
                                                            <div>
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-muted-foreground">Wallet Age</span>
                                                                    <span className="font-semibold">{tx.analysis_data.breakdown.walletAge}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-accent-blue/50 transition-all duration-500"
                                                                        style={{ width: `${tx.analysis_data.breakdown.walletAge}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-muted-foreground">Transaction Pattern</span>
                                                                    <span className="font-semibold">{tx.analysis_data.breakdown.transactionPattern}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-accent-blue/50 transition-all duration-500"
                                                                        style={{ width: `${tx.analysis_data.breakdown.transactionPattern}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Transaction Details */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                                        <Database className="h-4 w-4 text-purple-500" />
                                                        Transaction Details
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">From:</span>
                                                            <code className="text-xs font-mono">{tx.from_address.slice(0, 20)}...</code>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">To:</span>
                                                            <code className="text-xs font-mono">{tx.to_address.slice(0, 20)}...</code>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Confidence:</span>
                                                            <span>{(tx.confidence * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Created:</span>
                                                            <span>{new Date(tx.created_at).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </GlassPanel>
            </Section>
        </div>
    );
};

export default AegisReviewQueue;
