import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import {
    Activity,
    AlertTriangle,
    Bot,
    Clock,
    Database,
    Gauge,
    Lock,
    PauseCircle,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react';
import { buildApiUrl } from '../utils/api';

interface HorizonStatusResponse {
    success: boolean;
    agent?: {
        started_at?: string | null;
        last_run_at?: string | null;
        last_run_ms?: number | null;
        running?: boolean;
        run_count?: number;
        last_error?: string | null;
    };
    totals?: {
        incidents_total?: number;
        incidents_open?: number;
        circuit_breakers_total?: number;
        circuit_breakers_active?: number;
        snapshots_indexed?: number;
        attestations_relayed?: number;
        incidents_detected?: number;
    };
}

interface HorizonIncident {
    incident_id: string;
    incident_type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    risk_score: number;
    confidence?: number | null;
    summary: string;
    status: 'open' | 'resolved';
    created_at?: string;
    on_chain_status?: string | null;
    details?: Record<string, unknown>;
}

interface HorizonAction {
    action_id: string;
    action_type: string;
    status: string;
    scope?: string | null;
    severity?: string | null;
    reason?: string | null;
    created_at?: string;
    expires_at?: string | null;
    action_result?: Record<string, unknown> | null;
}

const severityStyles: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/25',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    medium: 'text-sky-400 bg-sky-500/10 border-sky-500/25',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

const scoreToPercent = (value: number) => `${Math.round((Number(value) || 0) * 100)}%`;

const toDateLabel = (value?: string | null) => {
    if (!value) return 'Never';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return parsed.toLocaleString();
};

const HorizonNetworkMonitor: React.FC = () => {
    const [status, setStatus] = useState<HorizonStatusResponse | null>(null);
    const [incidents, setIncidents] = useState<HorizonIncident[]>([]);
    const [actions, setActions] = useState<HorizonAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        try {
            const [statusRes, incidentsRes, actionsRes] = await Promise.all([
                fetch(buildApiUrl('/horizon/status')),
                fetch(buildApiUrl('/horizon/incidents?limit=40')),
                fetch(buildApiUrl('/horizon/circuit-breakers?limit=40')),
            ]);

            if (!statusRes.ok || !incidentsRes.ok || !actionsRes.ok) {
                throw new Error('Failed to fetch Horizon dashboard data');
            }

            const statusPayload = await statusRes.json();
            const incidentsPayload = await incidentsRes.json();
            const actionsPayload = await actionsRes.json();

            setStatus(statusPayload as HorizonStatusResponse);
            setIncidents(Array.isArray(incidentsPayload?.incidents) ? incidentsPayload.incidents : []);
            setActions(Array.isArray(actionsPayload?.actions) ? actionsPayload.actions : []);
            setError(null);
        } catch (fetchError) {
            console.error(fetchError);
            setError('Unable to load Horizon telemetry right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const timer = setInterval(fetchDashboard, 20_000);
        return () => clearInterval(timer);
    }, [fetchDashboard]);

    const runCycle = async () => {
        try {
            setRunning(true);
            const res = await fetch(buildApiUrl('/horizon/run'), { method: 'POST' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.reason || payload?.error || 'Failed to run Horizon cycle');
            }
            await fetchDashboard();
        } catch (cycleError) {
            console.error(cycleError);
            setError((cycleError as Error).message || 'Horizon cycle failed.');
        } finally {
            setRunning(false);
        }
    };

    const openIncidents = useMemo(
        () => incidents.filter(incident => incident.status === 'open'),
        [incidents]
    );

    const activeBreakers = useMemo(
        () => actions.filter(action => action.status === 'active'),
        [actions]
    );

    const relayedIncidents = useMemo(
        () => incidents.filter(incident => incident.on_chain_status === 'submitted'),
        [incidents]
    );

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-4xl mx-auto mb-10">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-rose-500/10 text-rose-400 mb-5">
                        <Activity className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Horizon <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300">Network/DeFi Monitor</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Off-chain indexer that emits signed incident attestations and triggers policy-governed circuit breakers.
                    </p>
                </div>

                <GlassPanel className="p-5 mb-8 border border-rose-500/20" hoverEffect>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-muted-foreground">Agent Runtime</p>
                            <div className="flex items-center gap-3 text-sm">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${status?.agent?.running ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-500/40 text-slate-300'}`}>
                                    <span className={`h-2 w-2 rounded-full ${status?.agent?.running ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                                    {status?.agent?.running ? 'Running cycle' : 'Idle'}
                                </span>
                                <span className="text-muted-foreground">Last run: {toDateLabel(status?.agent?.last_run_at)}</span>
                            </div>
                        </div>
                        <Button
                            variant="glass"
                            onClick={runCycle}
                            disabled={running}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
                            {running ? 'Running Horizon' : 'Run Horizon Cycle'}
                        </Button>
                    </div>
                    {status?.agent?.last_error && (
                        <p className="mt-4 text-sm text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {status.agent.last_error}
                        </p>
                    )}
                </GlassPanel>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">Open Incidents</p>
                            <ShieldAlert className="h-4 w-4 text-red-400" />
                        </div>
                        <p className="text-3xl font-bold">{status?.totals?.incidents_open ?? openIncidents.length}</p>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">Active Breakers</p>
                            <PauseCircle className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="text-3xl font-bold">{status?.totals?.circuit_breakers_active ?? activeBreakers.length}</p>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">Attestations Relayed</p>
                            <Lock className="h-4 w-4 text-cyan-400" />
                        </div>
                        <p className="text-3xl font-bold">{status?.totals?.attestations_relayed ?? relayedIncidents.length}</p>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">Snapshots Indexed</p>
                            <Database className="h-4 w-4 text-sky-400" />
                        </div>
                        <p className="text-3xl font-bold">{status?.totals?.snapshots_indexed ?? 0}</p>
                    </GlassPanel>
                </div>

                {error && (
                    <GlassPanel className="p-4 mb-8 border border-red-500/25">
                        <p className="text-sm text-red-300">{error}</p>
                    </GlassPanel>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Gauge className="h-5 w-5 text-rose-300" />
                            <h2 className="text-xl font-semibold">Incident Feed</h2>
                        </div>

                        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                            {loading && incidents.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Loading incidents...</p>
                            ) : incidents.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No incidents captured yet.</p>
                            ) : incidents.map((incident) => (
                                <div key={incident.incident_id} className="p-3 rounded-lg border border-border/40 bg-background/30">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold uppercase ${severityStyles[incident.severity] || severityStyles.medium}`}>
                                            {incident.severity}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{toDateLabel(incident.created_at)}</span>
                                    </div>
                                    <p className="text-sm font-semibold mb-1">{incident.summary}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <Bot className="h-3.5 w-3.5" />
                                            {incident.incident_type}
                                        </span>
                                        <span>Risk {scoreToPercent(incident.risk_score)}</span>
                                        <span>Confidence {scoreToPercent(Number(incident.confidence || 0))}</span>
                                        <span className="uppercase">{incident.status}</span>
                                        <span className={`uppercase ${incident.on_chain_status === 'submitted' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                            {incident.on_chain_status || 'not relayed'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5 text-amber-300" />
                            <h2 className="text-xl font-semibold">Circuit Breaker Log</h2>
                        </div>

                        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                            {loading && actions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Loading circuit-breaker actions...</p>
                            ) : actions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No circuit-breaker actions recorded yet.</p>
                            ) : actions.map((action) => (
                                <div key={action.action_id} className="p-3 rounded-lg border border-border/40 bg-background/30">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <p className="text-sm font-semibold">{action.action_type}</p>
                                        <span className={`text-xs uppercase ${action.status === 'failed' ? 'text-red-400' : action.status === 'active' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {action.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">{action.reason || 'No reason provided.'}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {action.scope && <span>Scope: {action.scope}</span>}
                                        <span>{toDateLabel(action.created_at)}</span>
                                        {action.expires_at && <span>Expires: {toDateLabel(action.expires_at)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>

                <GlassPanel className="p-6 mt-6 border border-cyan-500/20">
                    <h2 className="text-lg font-semibold mb-2">On-Chain Attestation Pipeline</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Every qualifying incident is canonicalized, signed with ML-DSA context dytallix-oracle on the server, and relayed as a Horizon incident attestation.
                        Circuit-breaker responses then apply policy actions: bridge halts/resumes, targeted wallet throttles, and governance parameter-shift proposals.
                    </p>
                </GlassPanel>
            </Section>
        </div>
    );
};

export default HorizonNetworkMonitor;
