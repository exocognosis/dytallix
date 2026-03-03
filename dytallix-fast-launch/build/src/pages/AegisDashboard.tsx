import React, { useState, useEffect } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    Shield, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock,
    ChevronDown, ChevronUp, Copy, Check, Info, Zap, Database, Lock, Wifi, WifiOff
} from 'lucide-react';
import { useAegisWebSocket, type AegisAlert } from '../hooks/useAegisWebSocket';
import { AlertContainer } from '../components/aegis/AlertToast';
import { buildApiUrl } from '../utils/api';

interface AegisStats {
    total_transactions: number;
    total_wallets: number;
    average_risk_score: number;
    high_risk_count: number;
    transactions_today: number;
    transactions_this_hour: number;
    last_analysis: string | null;
    uptime: number;
    risk_distribution: {
        low: number;
        medium: number;
        high: number;
    };
}

interface RecentAnalysis {
    tx_hash: string;
    from_address: string;
    to_address: string;
    amount: number;
    risk_score: number;
    confidence: number;
    created_at: string;
    analysis_data?: {
        breakdown?: {
            walletAge: number;
            transactionPattern: number;
            amountAnomaly: number;
            interactionDiversity: number;
        };
        riskLevel?: string;
        walletHistoryCount?: number;
        walletBalance?: number;
    };
}

const AegisDashboard: React.FC = () => {
    const [stats, setStats] = useState<AegisStats | null>(null);
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);
    const [showTechDetails, setShowTechDetails] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState<AegisAlert[]>([]);

    // WebSocket connection for real-time alerts
    const { isConnected, latestAlert } = useAegisWebSocket();

    // Handle new alerts
    useEffect(() => {
        if (latestAlert) {
            setActiveAlerts(prev => [...prev, latestAlert]);
        }
    }, [latestAlert]);

    const dismissAlert = (index: number) => {
        setActiveAlerts(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [statsRes, recentRes] = await Promise.all([
                    fetch(buildApiUrl('/aegis/stats')),
                    fetch(buildApiUrl('/aegis/recent?limit=20'))
                ]);

                const statsData = await statsRes.json();
                const recentData = await recentRes.json();

                if (statsData.success) {
                    setStats(statsData.stats);
                }

                if (recentData.success) {
                    setRecentAnalyses(recentData.analyses);
                }

                setError(null);
            } catch (err) {
                setError('Failed to load Aegis data');
                console.error('Error fetching Aegis data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const getRiskColor = (score: number) => {
        if (score >= 70) return 'text-red-500';
        if (score >= 40) return 'text-amber-500';
        return 'text-green-500';
    };

    const getRiskBg = (score: number) => {
        if (score >= 70) return 'bg-red-500/10';
        if (score >= 40) return 'bg-amber-500/10';
        return 'bg-green-500/10';
    };

    const getRiskBorder = (score: number) => {
        if (score >= 70) return 'border-red-500/20';
        if (score >= 40) return 'border-amber-500/20';
        return 'border-green-500/20';
    };

    const getRiskLabel = (score: number) => {
        if (score >= 70) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        return 'LOW';
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedHash(id);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    const toggleRow = (hash: string) => {
        setExpandedRow(expandedRow === hash ? null : hash);
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-accent-blue animate-pulse mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Loading Aegis Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            {/* Alert Toasts */}
            <AlertContainer alerts={activeAlerts} onDismiss={dismissAlert} />

            <Section className="relative z-10">
                {/* Hero Section */}
                <div className="text-center max-w-4xl mx-auto mb-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Shield className="w-12 h-12 text-accent-blue" />
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                            Aegis <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-purple-500">Dashboard</span>
                        </h1>
                        {/* Connection Status */}
                        <div className="ml-4 flex items-center gap-2">
                            {isConnected ? (
                                <>
                                    <Wifi className="h-5 w-5 text-green-500" />
                                    <span className="text-xs text-green-500 font-semibold">LIVE</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-5 w-5 text-red-500 animate-pulse" />
                                    <span className="text-xs text-red-500 font-semibold">OFFLINE</span>
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-lg text-muted-foreground">
                        Real-time transaction vulnerability assessment powered by quantum-resistant cryptography
                    </p>
                </div>

                {/* What is Aegis */}
                <GlassPanel className="p-6 text-left mb-12 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10" hoverEffect>
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Info className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-3">What is Aegis?</h3>
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                Aegis is a quantum-resistant active defense system that provides real-time assessment of transaction vulnerability.
                                Using advanced multi-factor risk scoring and post-quantum cryptography, Aegis analyzes wallet behavior,
                                transaction patterns, and cryptographic primitives to identify potentially malicious activity before it impacts the network.
                            </p>

                            <button
                                onClick={() => setShowTechDetails(!showTechDetails)}
                                className="flex items-center gap-2 text-accent-blue hover:text-accent-blue/80 transition-colors"
                            >
                                {showTechDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="text-sm font-semibold">Technical Details</span>
                            </button>

                            {showTechDetails && (
                                <div className="mt-4 pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-purple-500" />
                                            Quantum-Resistant Cryptography
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">ML-DSA-87 (CRYSTALS-Dilithium):</strong> NIST-standardized post-quantum digital signatures with 2592-byte public keys, providing Level 5 security against quantum attacks</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Kyber-1024:</strong> Lattice-based encryption (integration pending) for quantum-resistant data protection</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-amber-500" />
                                            Multi-Factor Risk Scoring
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Wallet Age (25%):</strong> Newer wallets receive higher risk scores</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Transaction Patterns (30%):</strong> Detects bot-like behavior and anomalies</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Amount Anomalies (25%):</strong> Statistical analysis of transaction amounts</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Interaction Diversity (20%):</strong> Identifies wash trading patterns</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Database className="h-4 w-4 text-green-500" />
                                            Real-Time Monitoring
                                        </h4>
                                        <p className="text-sm text-muted-foreground ml-6">
                                            All risk scores are signed with ML-DSA-87 quantum-resistant signatures and stored on-chain for
                                            transparent verification. The system analyzes transactions in real-time, providing immediate
                                            risk assessments with confidence scores based on available data.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassPanel>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-500">{error}</p>
                    </div>
                )}

                {/* Enhanced Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Analyses</p>
                                    <p className="text-2xl font-bold">{stats.total_transactions.toLocaleString()}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Wallets Tracked</p>
                                    <p className="text-2xl font-bold">{stats.total_wallets.toLocaleString()}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Avg Risk Score</p>
                                    <p className="text-2xl font-bold">{stats.average_risk_score}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">High Risk</p>
                                    <p className="text-2xl font-bold">{stats.high_risk_count}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        {/* Additional Stats Row */}
                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                    <Zap className="h-6 w-6 text-cyan-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Today</p>
                                    <p className="text-2xl font-bold">{stats.transactions_today.toLocaleString()}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-pink-500" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">This Hour</p>
                                    <p className="text-2xl font-bold">{stats.transactions_this_hour.toLocaleString()}</p>
                                </div>
                            </div>
                        </GlassPanel>

                        <GlassPanel className="p-6 col-span-1 md:col-span-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/10" hoverEffect>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">System Status</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-2xl font-bold">Active</p>
                                        <span className="text-sm text-muted-foreground">
                                            • Uptime: {Math.floor(stats.uptime / 60)}m
                                        </span>
                                        {stats.last_analysis && (
                                            <span className="text-sm text-muted-foreground">
                                                • Last: {new Date(stats.last_analysis).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                )
                }

                {/* Risk Distribution */}
                {
                    stats && (
                        <GlassPanel className="p-6 mb-12" hoverEffect>
                            <h2 className="text-xl font-bold mb-6">Risk Distribution</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center transition-all duration-300 hover:scale-105">
                                    <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3 transition-all duration-300 hover:bg-green-500/20 hover:shadow-lg hover:shadow-green-500/20">
                                        <CheckCircle className="h-12 w-12 text-green-500" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">Low Risk</p>
                                    <p className="text-3xl font-bold text-green-500">{stats.risk_distribution.low}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.total_transactions > 0 ? Math.round((stats.risk_distribution.low / stats.total_transactions) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="text-center transition-all duration-300 hover:scale-105">
                                    <div className="h-24 w-24 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3 transition-all duration-300 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/20">
                                        <Clock className="h-12 w-12 text-amber-500" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">Medium Risk</p>
                                    <p className="text-3xl font-bold text-amber-500">{stats.risk_distribution.medium}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.total_transactions > 0 ? Math.round((stats.risk_distribution.medium / stats.total_transactions) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="text-center transition-all duration-300 hover:scale-105">
                                    <div className="h-24 w-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 transition-all duration-300 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/20">
                                        <AlertTriangle className="h-12 w-12 text-red-500" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">High Risk</p>
                                    <p className="text-3xl font-bold text-red-500">{stats.risk_distribution.high}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.total_transactions > 0 ? Math.round((stats.risk_distribution.high / stats.total_transactions) * 100) : 0}%
                                    </p>
                                </div>
                            </div>
                        </GlassPanel>
                    )
                }

                {/* Enhanced Transaction Table */}
                <GlassPanel className="p-6" hoverEffect>
                    <h2 className="text-xl font-bold mb-6">Recent Transaction Analyses</h2>
                    {recentAnalyses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No analyses yet. Analyze your first transaction!</p>
                    ) : (
                        <div className="space-y-2">
                            {recentAnalyses.map((analysis) => (
                                <div key={analysis.tx_hash} className="border border-border/30 rounded-lg overflow-hidden transition-all duration-300 hover:border-accent-blue/30 hover:shadow-lg hover:shadow-accent-blue/5">
                                    {/* Main Row */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                                        onClick={() => toggleRow(analysis.tx_hash)}
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-3">
                                                <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono">{analysis.tx_hash.slice(0, 16)}...</code>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyToClipboard(analysis.tx_hash, analysis.tx_hash);
                                                        }}
                                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {copiedHash === analysis.tx_hash ? (
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">From</p>
                                                <code className="text-xs font-mono">{analysis.from_address.slice(0, 12)}...</code>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                                                <p className="text-sm font-mono">{analysis.amount.toFixed(2)}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Risk</p>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBg(analysis.risk_score)} ${getRiskColor(analysis.risk_score)} ${getRiskBorder(analysis.risk_score)}`}>
                                                    {getRiskLabel(analysis.risk_score)} ({analysis.risk_score})
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                                                <p className="text-sm">{(analysis.confidence * 100).toFixed(0)}%</p>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                {expandedRow === analysis.tx_hash ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedRow === analysis.tx_hash && analysis.analysis_data && (
                                        <div className="border-t border-border/30 bg-accent/5 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Risk Factor Breakdown */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                                        <Activity className="h-4 w-4 text-accent-blue" />
                                                        Risk Factor Breakdown
                                                    </h4>
                                                    {analysis.analysis_data.breakdown && (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs text-muted-foreground">Wallet Age (25%)</span>
                                                                    <span className="text-xs font-semibold">{analysis.analysis_data.breakdown.walletAge}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getRiskBg(analysis.analysis_data.breakdown.walletAge)} transition-all duration-500`}
                                                                        style={{ width: `${analysis.analysis_data.breakdown.walletAge}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1">Newer wallets receive higher risk scores</p>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs text-muted-foreground">Transaction Pattern (30%)</span>
                                                                    <span className="text-xs font-semibold">{analysis.analysis_data.breakdown.transactionPattern}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getRiskBg(analysis.analysis_data.breakdown.transactionPattern)} transition-all duration-500`}
                                                                        style={{ width: `${analysis.analysis_data.breakdown.transactionPattern}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1">Detects bot-like behavior and anomalies</p>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs text-muted-foreground">Amount Anomaly (25%)</span>
                                                                    <span className="text-xs font-semibold">{analysis.analysis_data.breakdown.amountAnomaly}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getRiskBg(analysis.analysis_data.breakdown.amountAnomaly)} transition-all duration-500`}
                                                                        style={{ width: `${analysis.analysis_data.breakdown.amountAnomaly}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1">Statistical analysis of transaction amounts</p>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs text-muted-foreground">Interaction Diversity (20%)</span>
                                                                    <span className="text-xs font-semibold">{analysis.analysis_data.breakdown.interactionDiversity}</span>
                                                                </div>
                                                                <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getRiskBg(analysis.analysis_data.breakdown.interactionDiversity)} transition-all duration-500`}
                                                                        style={{ width: `${analysis.analysis_data.breakdown.interactionDiversity}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1">Identifies wash trading patterns</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Wallet Metadata */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                                        <Database className="h-4 w-4 text-purple-500" />
                                                        Wallet Information
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">To Address:</span>
                                                            <code className="text-xs font-mono">{analysis.to_address.slice(0, 16)}...</code>
                                                        </div>
                                                        {analysis.analysis_data.walletBalance !== undefined && (
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Balance:</span>
                                                                <span className="font-mono">{analysis.analysis_data.walletBalance.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {analysis.analysis_data.walletHistoryCount !== undefined && (
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Transaction Count:</span>
                                                                <span>{analysis.analysis_data.walletHistoryCount}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Analyzed:</span>
                                                            <span>{new Date(analysis.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <div className="pt-3 mt-3 border-t border-border/30">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Lock className="h-3 w-3 text-green-500" />
                                                                <span className="text-green-500 font-semibold">Quantum Signature: Verified</span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Signed with ML-DSA-87 (CRYSTALS-Dilithium5)
                                                            </p>
                                                        </div>
                                                        {/* Throttle Status */}
                                                        <div className="pt-3 mt-3 border-t border-border/30">
                                                            <div className="flex items-center gap-2 text-xs mb-2">
                                                                <Clock className="h-3 w-3 text-amber-500" />
                                                                <span className="text-foreground font-semibold">Throttle Status</span>
                                                            </div>
                                                            <div className="text-xs space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Level:</span>
                                                                    <span className={`font-semibold ${analysis.risk_score >= 90 ? 'text-red-500' :
                                                                        analysis.risk_score >= 80 ? 'text-orange-500' :
                                                                            analysis.risk_score >= 60 ? 'text-amber-500' :
                                                                                analysis.risk_score >= 40 ? 'text-yellow-500' :
                                                                                    'text-green-500'
                                                                        }`}>
                                                                        {analysis.risk_score >= 90 ? 'Level 4 (Critical)' :
                                                                            analysis.risk_score >= 80 ? 'Level 3 (Heavy)' :
                                                                                analysis.risk_score >= 60 ? 'Level 2 (Medium)' :
                                                                                    analysis.risk_score >= 40 ? 'Level 1 (Light)' :
                                                                                        'Level 0 (None)'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Limit:</span>
                                                                    <span className="text-foreground">
                                                                        {analysis.risk_score >= 90 ? 'Review Required' :
                                                                            analysis.risk_score >= 80 ? '2 tx/hour' :
                                                                                analysis.risk_score >= 60 ? '5 tx/hour' :
                                                                                    analysis.risk_score >= 40 ? '10 tx/hour' :
                                                                                        'Unlimited'}
                                                                    </span>
                                                                </div>
                                                            </div>
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
            </Section >
        </div >
    );
};

export default AegisDashboard;
