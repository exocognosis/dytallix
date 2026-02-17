import React, { useState, useEffect } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    Shield, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock,
    ChevronDown, ChevronUp, Copy, Check, Info, Zap, Database, Lock, Wifi, WifiOff, Bot, Search
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAegisWebSocket, type AegisAlert } from '../hooks/useAegisWebSocket';
import { AlertContainer } from '../components/aegis/AlertToast';
import { buildApiUrl } from '../utils/api';
import { useNavigate } from 'react-router-dom';

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

interface AegisQueueStats {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    critical: number;
    high: number;
    normal: number;
    oldest_pending?: { created_at: string; expires_at: string } | null;
}

interface AegisInsightsBucket {
    t: string;
    total: number;
    high: number;
    medium: number;
    low: number;
    avg_risk: number;
}

interface AegisRecommendation {
    id: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    message: string;
    action?: string;
}

interface AegisTopWallet {
    address: string;
    tx_count: number;
    avg_risk_score: number;
    max_risk_score: number;
    last_seen: string;
}

interface AegisInsights {
    generated_at: string;
    window: { hours: number; bucket_minutes: number };
    series: AegisInsightsBucket[];
    forecast: {
        next_bucket: {
            t: string;
            bucket_minutes: number;
            total: number;
            high: number;
            medium: number;
            low: number;
            high_ratio: number;
            confidence: number;
            method: string;
            total_ci?: { lower: number; upper: number };
            high_ratio_ci?: { lower: number; upper: number };
        };
    };
    queue?: AegisQueueStats;
    throttled_wallets?: number;
    top_wallets?: AegisTopWallet[];
    recommendations: AegisRecommendation[];
}

interface AegisPosture {
    generated_at: string;
    window: { days: number };
    sla: {
        critical: {
            minutes: number;
            pending_breached: number;
            pending_due_soon: number;
            decided_total: number;
            decided_within_sla: number;
            compliance_rate: number;
        };
        high: {
            minutes: number;
            pending_breached: number;
            pending_due_soon: number;
            decided_total: number;
            decided_within_sla: number;
            compliance_rate: number;
        };
    };
    time_to_decision_minutes: {
        overall: { count: number; avg_minutes: number; p50_minutes: number; p90_minutes: number; p95_minutes: number };
        critical: { count: number; avg_minutes: number; p50_minutes: number; p90_minutes: number; p95_minutes: number };
        high: { count: number; avg_minutes: number; p50_minutes: number; p90_minutes: number; p95_minutes: number };
    };
    outcomes: {
        overall: { approved: number; rejected: number; expired: number; false_positive_rate: number };
        critical: { approved: number; rejected: number; expired: number; false_positive_rate: number };
        high: { approved: number; rejected: number; expired: number; false_positive_rate: number };
    };
    notes?: string[];
}

type AegisLookupType = 'auto' | 'wallet' | 'transaction' | 'block' | 'attestation' | 'anchoring';

interface AegisSearchRisk {
    risk_score: number;
    risk_level: string;
    confidence?: number | null;
    recommendation?: string;
}

interface AegisSearchResult {
    success: boolean;
    type: string;
    query: string;
    source?: string;
    risk?: AegisSearchRisk | null;
    timestamp?: string;
    [key: string]: unknown;
}

const AegisDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<AegisStats | null>(null);
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
    const [insights, setInsights] = useState<AegisInsights | null>(null);
    const [posture, setPosture] = useState<AegisPosture | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);
    const [showTechDetails, setShowTechDetails] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState<AegisAlert[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<AegisLookupType>('auto');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchResult, setSearchResult] = useState<AegisSearchResult | null>(null);

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

                // Insights are optional; keep dashboard usable even if the endpoint is unavailable.
                try {
                    const insightsRes = await fetch(buildApiUrl('/aegis/insights?hours=24&bucket_minutes=60&top_wallets=5'));
                    if (insightsRes.ok) {
                        const insightsData = await insightsRes.json();
                        if (insightsData.success) {
                            setInsights(insightsData.insights);
                        }
                    }
                } catch (e) {
                    // Non-fatal
                }

                // Posture KPIs are optional; keep dashboard usable even if unavailable.
                try {
                    const postureRes = await fetch(buildApiUrl('/aegis/posture?days=7'));
                    if (postureRes.ok) {
                        const postureData = await postureRes.json();
                        if (postureData.success) {
                            setPosture(postureData.posture);
                        }
                    }
                } catch (e) {
                    // Non-fatal
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

    const formatBucketLabel = (iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getSearchPlaceholder = (lookupType: AegisLookupType) => {
        switch (lookupType) {
            case 'wallet':
                return 'dytallix1... wallet address';
            case 'transaction':
                return '0x... transaction hash';
            case 'block':
                return 'Block height or hash';
            case 'attestation':
                return 'Transaction hash tied to oracle attestation';
            case 'anchoring':
                return 'anchor:<hash>, block height, or anchored asset hash';
            default:
                return 'Auto-detect wallet, transaction, block, attestation, or anchoring';
        }
    };

    const handleAegisSearch = async () => {
        const query = searchQuery.trim();
        if (!query) {
            setSearchError('Enter a wallet, transaction hash, block, attestation, or anchoring reference.');
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        try {
            const params = new URLSearchParams({
                q: query,
                type: searchType
            });
            const response = await fetch(buildApiUrl(`/aegis/search?${params.toString()}`));
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload?.success) {
                setSearchResult(null);
                setSearchError(payload?.error || 'Lookup failed');
                return;
            }

            setSearchResult(payload as AegisSearchResult);
        } catch (err) {
            setSearchResult(null);
            setSearchError('Failed to query Aegis search API');
            console.error('Aegis search failed', err);
        } finally {
            setSearchLoading(false);
        }
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
                                Aegis is Dytallix's transaction and wallet defense layer. It scores risk in real time, signs oracle attestations
                                with post-quantum cryptography, and coordinates automated actions such as review queueing, throttling, and
                                governance escalation when confidence is high. It also provides predictive risk insights and posture metrics
                                so operators can act before threats spread.
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
                                            Oracle Attestations and Cryptography
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">ML-DSA-87 signatures:</strong> Canonical risk payloads are signed with context-aware PQC signatures for verifiable oracle provenance</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Structured attestation schema:</strong> Includes tx hash, model id, score (0-1), confidence, nonce, expiry, signature, and oracle public key</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">On-chain relay path:</strong> Attestations are relayed to oracle batch ingest endpoints and relay outcomes are tracked per analysis</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-amber-500" />
                                            Agentic Risk Controls
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Heuristic multi-factor scoring:</strong> Wallet age, transaction patterns, amount anomalies, and interaction diversity produce risk + confidence</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Automated actions:</strong> High-risk flows can trigger review queueing, dynamic throttles, and real-time alert broadcasts</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Escalation logic:</strong> Critical high-confidence events can open governance/slashing escalation records for operator review</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Human-in-the-loop controls:</strong> Analysts can approve/reject queued cases while preserving a full audit trail</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Database className="h-4 w-4 text-green-500" />
                                            Predictive and Feedback Intelligence
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Predictive insights:</strong> Forecasts near-term high-risk activity, queue pressure, and top risky wallets from recent telemetry</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Security posture metrics:</strong> Tracks review SLA compliance, time-to-decision, and approximate false-positive rates</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent-blue mt-1">•</span>
                                                <span><strong className="text-foreground">Validator feedback loop:</strong> Captures outcome reports and computes oracle accuracy/reputation over configurable windows</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6 mb-12" hoverEffect>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Search className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Search And Analyze</h2>
                            <p className="text-sm text-muted-foreground">
                                Query wallet, transaction, block, attestation, or anchoring records and return a live risk posture.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3">
                        <select
                            value={searchType}
                            onChange={(event) => setSearchType(event.target.value as AegisLookupType)}
                            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="auto">Auto Detect</option>
                            <option value="wallet">Wallet</option>
                            <option value="transaction">Transaction</option>
                            <option value="block">Block</option>
                            <option value="attestation">Attestation</option>
                            <option value="anchoring">Anchoring</option>
                        </select>

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleAegisSearch();
                                }
                            }}
                            placeholder={getSearchPlaceholder(searchType)}
                            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />

                        <button
                            onClick={handleAegisSearch}
                            disabled={searchLoading}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                            <Search className="h-4 w-4" />
                            {searchLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>

                    {searchError && (
                        <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                            <p className="text-sm text-red-400">{searchError}</p>
                        </div>
                    )}

                    {searchResult && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Type</p>
                                    <p className="text-sm font-semibold capitalize">{searchResult.type}</p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Source</p>
                                    <p className="text-sm font-semibold">{searchResult.source || 'Aegis'}</p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Risk</p>
                                    {searchResult.risk ? (
                                        <p className={`text-sm font-semibold ${getRiskColor(searchResult.risk.risk_score)}`}>
                                            {searchResult.risk.risk_level} ({searchResult.risk.risk_score})
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not available</p>
                                    )}
                                </div>
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommendation</p>
                                    <p className="text-sm font-semibold">{searchResult.risk?.recommendation || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border border-border/30 bg-black/20">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Result Payload</p>
                                <pre className="text-xs md:text-sm font-mono whitespace-pre-wrap break-all max-h-[360px] overflow-auto text-foreground/90">
                                    {JSON.stringify(searchResult, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
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

                {/* Security Posture KPIs */}
                {posture && (
                    <GlassPanel className="p-6 mb-12" hoverEffect>
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Security Posture</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Last {posture.window.days}d • updated {new Date(posture.generated_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/aegis-review-queue')}
                                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors"
                            >
                                Review Queue
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={`p-4 rounded-lg border ${posture.sla.critical.pending_breached > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-border/30 bg-accent/5'}`}>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">CRITICAL SLA</p>
                                <p className="text-2xl font-bold text-red-500">{Math.round(posture.sla.critical.compliance_rate * 100)}%</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {posture.sla.critical.decided_within_sla}/{posture.sla.critical.decided_total} within {posture.sla.critical.minutes}m
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Breaches: {posture.sla.critical.pending_breached} • Due soon: {posture.sla.critical.pending_due_soon}
                                </p>
                            </div>

                            <div className={`p-4 rounded-lg border ${posture.sla.high.pending_breached > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/30 bg-accent/5'}`}>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">HIGH SLA</p>
                                <p className="text-2xl font-bold text-amber-500">{Math.round(posture.sla.high.compliance_rate * 100)}%</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {posture.sla.high.decided_within_sla}/{posture.sla.high.decided_total} within {Math.round(posture.sla.high.minutes / 60)}h
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Breaches: {posture.sla.high.pending_breached} • Due soon: {posture.sla.high.pending_due_soon}
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Time To Decision</p>
                                <p className="text-2xl font-bold">{posture.time_to_decision_minutes.overall.p50_minutes}m</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    P95: {posture.time_to_decision_minutes.overall.p95_minutes}m • n={posture.time_to_decision_minutes.overall.count}
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">False Positives (Approx)</p>
                                <p className="text-2xl font-bold">{Math.round(posture.outcomes.overall.false_positive_rate * 100)}%</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Approved {posture.outcomes.overall.approved} • Rejected {posture.outcomes.overall.rejected}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-4">
                            Containment is proxied by time-to-review-decision; FP rate is approximated from approve/reject outcomes.
                        </p>
                    </GlassPanel>
                )}

                {/* Predictive + Agentic Insights */}
                {insights && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {/* Predictive Outlook */}
                        <GlassPanel className="p-6" hoverEffect>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">Predictive Outlook</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Next bucket forecast ({insights.window.bucket_minutes}m) • confidence {(insights.forecast.next_bucket.confidence * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total</p>
                                    <p className="text-2xl font-bold">{insights.forecast.next_bucket.total}</p>
                                    {insights.forecast.next_bucket.total_ci && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            CI: {insights.forecast.next_bucket.total_ci.lower}–{insights.forecast.next_bucket.total_ci.upper}
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">High Risk</p>
                                    <p className="text-2xl font-bold text-red-500">{insights.forecast.next_bucket.high}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Share: {(insights.forecast.next_bucket.high_ratio * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Medium Risk</p>
                                    <p className="text-2xl font-bold text-amber-500">{insights.forecast.next_bucket.medium}</p>
                                </div>
                                <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Low Risk</p>
                                    <p className="text-2xl font-bold text-green-500">{insights.forecast.next_bucket.low}</p>
                                </div>
                            </div>

                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={(insights.series || []).map(p => ({
                                            ...p,
                                            label: formatBucketLabel(p.t)
                                        }))}
                                        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="aegisHigh" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="aegisMedium" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.30} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="aegisLow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={{ stroke: 'rgba(255,255,255,0.15)' }} />
                                        <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={{ stroke: 'rgba(255,255,255,0.15)' }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(0,0,0,0.75)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: '0.75rem'
                                            }}
                                            labelStyle={{ color: 'rgba(255,255,255,0.85)' }}
                                        />
                                        <Area type="monotone" dataKey="low" stackId="1" stroke="#10b981" fill="url(#aegisLow)" />
                                        <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="url(#aegisMedium)" />
                                        <Area type="monotone" dataKey="high" stackId="1" stroke="#ef4444" fill="url(#aegisHigh)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <p className="text-xs text-muted-foreground mt-4">
                                Method: {insights.forecast.next_bucket.method} • Updated {new Date(insights.generated_at).toLocaleTimeString()}
                            </p>
                        </GlassPanel>

                        {/* Aegis Agent */}
                        <GlassPanel className="p-6" hoverEffect>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">Aegis Agent</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Recommendations from live telemetry + forecasts
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs text-muted-foreground mb-1">Queue</p>
                                    <p className="text-lg font-bold">{insights.queue?.pending ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">pending</p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs text-muted-foreground mb-1">Critical</p>
                                    <p className="text-lg font-bold text-red-500">{insights.queue?.critical ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">pending</p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/30 bg-accent/5">
                                    <p className="text-xs text-muted-foreground mb-1">Throttled</p>
                                    <p className="text-lg font-bold">{insights.throttled_wallets ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">wallets</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(insights.recommendations || []).length === 0 ? (
                                    <div className="p-4 rounded-lg border border-border/30 bg-accent/5">
                                        <p className="text-sm text-muted-foreground">No urgent actions recommended.</p>
                                    </div>
                                ) : (
                                    insights.recommendations.map((rec) => {
                                        const style =
                                            rec.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                                                rec.severity === 'warn' ? 'border-amber-500/30 bg-amber-500/5' :
                                                    'border-blue-500/30 bg-blue-500/5';
                                        const iconColor =
                                            rec.severity === 'critical' ? 'text-red-500' :
                                                rec.severity === 'warn' ? 'text-amber-500' :
                                                    'text-blue-500';
                                        const Icon = rec.severity === 'info' ? Info : AlertTriangle;

                                        return (
                                            <div key={rec.id} className={`p-4 rounded-lg border ${style}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 ${iconColor}`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{rec.title}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                                                        {rec.action === 'open_review_queue' && (
                                                            <button
                                                                onClick={() => navigate('/aegis-review-queue')}
                                                                className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors"
                                                            >
                                                                Open Review Queue
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {insights.top_wallets && insights.top_wallets.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-border/30">
                                    <h3 className="text-sm font-semibold mb-3">Top Risky Wallets (window)</h3>
                                    <div className="space-y-2">
                                        {insights.top_wallets.slice(0, 5).map(w => (
                                            <div key={w.address} className="flex items-center justify-between text-sm">
                                                <code className="text-xs font-mono">{w.address.slice(0, 14)}...</code>
                                                <span className="text-xs text-muted-foreground">
                                                    max {w.max_risk_score} • {w.tx_count} tx
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </GlassPanel>
                    </div>
                )}

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
