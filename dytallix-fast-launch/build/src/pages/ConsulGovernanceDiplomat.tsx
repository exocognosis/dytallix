import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import {
    Brain,
    Scale,
    AlertTriangle,
    Activity,
    ShieldCheck,
    Triangle,
    RefreshCw,
    FileWarning,
    CheckCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Lock,
    Database,
    Bot,
} from 'lucide-react';
import { buildApiUrl } from '../utils/api';

interface ConsulStatusResponse {
    success: boolean;
    agent?: {
        started_at?: string | null;
        last_run_at?: string | null;
        last_run_ms?: number | null;
        running?: boolean;
        run_count?: number;
        last_error?: string | null;
        config?: {
            minQuorum?: number;
            oraclePeers?: string[];
            pollIntervalMs?: number;
            modelId?: string;
        };
    };
    totals?: {
        proposals_analyzed?: number;
        attestations_posted?: number;
        disputes_filed?: number;
        open_disputes?: number;
        on_chain_attestations?: number;
    };
    latest_attestations?: ConsulAttestation[];
    latest_disputes?: ConsulDispute[];
}

interface ConsulProposal {
    proposal_id: number;
    title: string;
    status: string;
    recommendation: 'support' | 'reject' | 'abstain' | 'escalate';
    recommendation_reason: string;
    risk_score: number;
    confidence: number;
    expected_impact_bps: number;
    downside_bps: number;
    upside_bps: number;
    policy_key?: string | null;
    quorum?: {
        quorum_met?: boolean;
        consensus_recommendation?: string | null;
        consensus_share?: number;
        unique_oracles?: number;
        disputed?: boolean;
        recommendation_breakdown?: Record<string, number>;
    } | null;
    generated_at: string;
}

interface ConsulAttestation {
    proposal_id: number;
    oracle_id: string;
    recommendation: string;
    risk_score: number;
    confidence?: number;
    posted_at?: string;
    ingested_at?: number;
}

interface ConsulDispute {
    dispute_id: string;
    proposal_id: number;
    filer_oracle_id: string;
    against_oracle_id?: string | null;
    reason: string;
    severity: string;
    status: string;
    created_at?: string | number;
}

const fmtPct = (value: number) => `${(value * 100).toFixed(1)}%`;
const fmtBps = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)} bps`;

const recommendationStyles: Record<string, string> = {
    support: 'text-emerald-400',
    reject: 'text-red-400',
    abstain: 'text-slate-300',
    escalate: 'text-amber-400',
};

const riskBarClass = (riskScore: number) => {
    if (riskScore >= 0.72) return 'from-red-500/80 to-red-400/30';
    if (riskScore >= 0.58) return 'from-amber-500/80 to-amber-400/30';
    return 'from-emerald-500/80 to-emerald-400/30';
};

const ConsulGovernanceDiplomat: React.FC = () => {
    const [status, setStatus] = useState<ConsulStatusResponse | null>(null);
    const [proposals, setProposals] = useState<ConsulProposal[]>([]);
    const [attestations, setAttestations] = useState<ConsulAttestation[]>([]);
    const [disputes, setDisputes] = useState<ConsulDispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);
    const [showTechDetails, setShowTechDetails] = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            const [statusRes, proposalsRes, attestationsRes, disputesRes] = await Promise.all([
                fetch(buildApiUrl('/consul/status')),
                fetch(buildApiUrl('/consul/proposals')),
                fetch(buildApiUrl('/consul/attestations?limit=120')),
                fetch(buildApiUrl('/consul/disputes?limit=120')),
            ]);

            if (!statusRes.ok || !proposalsRes.ok || !attestationsRes.ok || !disputesRes.ok) {
                throw new Error('Failed to fetch Consul dashboard data');
            }

            const statusPayload = (await statusRes.json()) as ConsulStatusResponse;
            const proposalsPayload = await proposalsRes.json();
            const attestationsPayload = await attestationsRes.json();
            const disputesPayload = await disputesRes.json();

            const proposalItems = Array.isArray(proposalsPayload?.proposals) ? proposalsPayload.proposals : [];
            const attestationItems = Array.isArray(attestationsPayload?.items) ? attestationsPayload.items : [];
            const disputeItems = Array.isArray(disputesPayload?.items) ? disputesPayload.items : [];

            setStatus(statusPayload);
            setProposals(proposalItems);
            setAttestations(attestationItems);
            setDisputes(disputeItems);

            if (selectedProposalId === null && proposalItems.length > 0) {
                setSelectedProposalId(proposalItems[0].proposal_id);
            }

            setError(null);
        } catch (fetchError) {
            console.error(fetchError);
            setError('Unable to load Consul dashboard right now.');
        } finally {
            setLoading(false);
        }
    }, [selectedProposalId]);

    useEffect(() => {
        fetchDashboard();
        const timer = setInterval(fetchDashboard, 20000);
        return () => clearInterval(timer);
    }, [fetchDashboard]);

    const runCycle = async () => {
        try {
            setRunning(true);
            const res = await fetch(buildApiUrl('/consul/run'), { method: 'POST' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.reason || payload?.error || 'Consul cycle failed');
            }
            await fetchDashboard();
        } catch (cycleError) {
            console.error(cycleError);
            setError((cycleError as Error).message || 'Failed to run Consul cycle.');
        } finally {
            setRunning(false);
        }
    };

    const submitDispute = async () => {
        if (!selectedProposalId || !disputeReason.trim()) return;

        try {
            setSubmittingDispute(true);
            const res = await fetch(buildApiUrl('/consul/disputes'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: selectedProposalId,
                    reason: disputeReason.trim(),
                    severity: 'medium',
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to submit dispute');
            }
            setDisputeReason('');
            await fetchDashboard();
        } catch (submitError) {
            console.error(submitError);
            setError((submitError as Error).message || 'Failed to submit dispute.');
        } finally {
            setSubmittingDispute(false);
        }
    };

    const openDisputesCount = useMemo(
        () => disputes.filter(dispute => dispute.status === 'open').length,
        [disputes]
    );

    const avgRisk = useMemo(() => {
        if (proposals.length === 0) return 0;
        return proposals.reduce((sum, proposal) => sum + proposal.risk_score, 0) / proposals.length;
    }, [proposals]);

    const avgConfidence = useMemo(() => {
        if (proposals.length === 0) return 0;
        return proposals.reduce((sum, proposal) => sum + proposal.confidence, 0) / proposals.length;
    }, [proposals]);

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-4xl mx-auto mb-10">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 text-purple-400 mb-5">
                        <Brain className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Consul <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Governance Diplomat</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Event-driven proposal watcher with on-chain risk attestations, quorum consensus checks, and dispute escalation.
                    </p>
                </div>

                <GlassPanel className="p-6 text-left mb-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10" hoverEffect>
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Info className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-3">What is Consul?</h3>
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                                Consul is Dytallix&apos;s governance diplomat module. It continuously watches proposal flow, simulates
                                policy and market impact, issues signed risk attestations on-chain, and coordinates quorum-aware
                                recommendation consensus across multiple oracle peers. When disagreement is material, it opens dispute
                                records so governance can resolve conflicts before execution risk compounds.
                            </p>

                            <button
                                onClick={() => setShowTechDetails(!showTechDetails)}
                                className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
                            >
                                {showTechDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="text-sm font-semibold">Technical Details</span>
                            </button>

                            {showTechDetails && (
                                <div className="mt-4 pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-cyan-300" />
                                            On-Chain Attestations and Cryptography
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">ML-DSA signed governance payloads:</strong> Proposal id, recommendation, risk score, confidence, and policy context are signed for verifiable provenance.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Canonical target hashing:</strong> Governance attestations use deterministic target strings to prevent ambiguous signing contexts.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Structured governance endpoints:</strong> Attestations, quorum snapshots, and disputes are persisted and queryable from oracle RPC routes.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Bot className="h-4 w-4 text-amber-300" />
                                            Agentic Governance Controls
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Event-driven watcher:</strong> Periodic proposal polling triggers risk simulation and recommendation generation without manual intervention.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Multi-oracle peer modeling:</strong> Peer personas are simulated to stress-test recommendation stability and disagreement conditions.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Automatic dispute filing:</strong> Divergent recommendation and risk bands can auto-open disputes to reduce single-agent capture risk.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Database className="h-4 w-4 text-emerald-300" />
                                            Quorum and Decision Integrity
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Quorum snapshots:</strong> Consensus recommendation, share, oracle diversity, and dispute flags are computed per proposal.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Risk-weighted recommendation logic:</strong> Recommendations are tied to modeled downside/upside and confidence bands, not just vote direction.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-300 mt-1">•</span>
                                                <span><strong className="text-foreground">Audit-ready governance trail:</strong> Attestation and dispute records remain queryable for policy review and post-mortem governance analysis.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassPanel>

                {error && (
                    <GlassPanel className="p-4 border-red-500/30 bg-red-500/10 text-red-200 mb-6">
                        {error}
                    </GlassPanel>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <GlassPanel className="p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Open Proposals</div>
                        <div className="text-2xl font-semibold text-foreground">{proposals.length}</div>
                    </GlassPanel>
                    <GlassPanel className="p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Avg Risk / Confidence</div>
                        <div className="text-sm text-foreground">
                            <span className="font-semibold text-amber-300">{fmtPct(avgRisk)}</span> /{' '}
                            <span className="font-semibold text-cyan-300">{fmtPct(avgConfidence)}</span>
                        </div>
                    </GlassPanel>
                    <GlassPanel className="p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Attestations Posted</div>
                        <div className="text-2xl font-semibold text-foreground">{status?.totals?.attestations_posted ?? 0}</div>
                    </GlassPanel>
                    <GlassPanel className="p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Open Disputes</div>
                        <div className="text-2xl font-semibold text-red-300">{openDisputesCount}</div>
                    </GlassPanel>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassPanel className="lg:col-span-2 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Scale className="h-4 w-4 text-cyan-300" />
                                <h2 className="font-semibold text-foreground">Proposal Risk Surface</h2>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={runCycle}
                                disabled={running}
                                className="border-cyan-500/40 text-cyan-200"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${running ? 'animate-spin' : ''}`} />
                                Run Consul Cycle
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading proposal simulations...</p>
                            ) : proposals.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No active governance proposals available.</p>
                            ) : proposals.map((proposal) => (
                                <div key={proposal.proposal_id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">#{proposal.proposal_id} {proposal.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {proposal.status} • Impact {fmtBps(proposal.expected_impact_bps)} • Key: {proposal.policy_key || 'general'}
                                            </p>
                                        </div>
                                        <div className={`text-xs font-semibold uppercase ${recommendationStyles[proposal.recommendation] || 'text-slate-200'}`}>
                                            {proposal.recommendation}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                                        <div>
                                            <p className="text-[11px] uppercase text-muted-foreground">Risk</p>
                                            <p className="text-sm text-foreground">{fmtPct(proposal.risk_score)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase text-muted-foreground">Confidence</p>
                                            <p className="text-sm text-foreground">{fmtPct(proposal.confidence)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase text-muted-foreground">Downside / Upside</p>
                                            <p className="text-sm text-foreground">{fmtBps(-Math.abs(proposal.downside_bps))} / {fmtBps(proposal.upside_bps)}</p>
                                        </div>
                                    </div>

                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                                        <div
                                            className={`h-full bg-gradient-to-r ${riskBarClass(proposal.risk_score)}`}
                                            style={{ width: `${Math.round(proposal.risk_score * 100)}%` }}
                                        />
                                    </div>

                                    <p className="text-xs text-muted-foreground">{proposal.recommendation_reason}</p>

                                    {proposal.quorum && (
                                        <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
                                            <span className="inline-flex items-center gap-1">
                                                {proposal.quorum.quorum_met ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Triangle className="h-3.5 w-3.5 text-amber-300" />}
                                                Quorum: {proposal.quorum.quorum_met ? 'met' : 'pending'}
                                            </span>
                                            <span>Consensus: {proposal.quorum.consensus_recommendation || 'n/a'}</span>
                                            <span>Share: {proposal.quorum.consensus_share ? `${(proposal.quorum.consensus_share * 100).toFixed(1)}%` : 'n/a'}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-emerald-300" />
                            <h2 className="font-semibold text-foreground">Agent Control</h2>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className={status?.agent?.running ? 'text-amber-300' : 'text-emerald-300'}>
                                    {status?.agent?.running ? 'Running cycle' : 'Idle'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Last run</span>
                                <span className="text-foreground">{status?.agent?.last_run_at || 'n/a'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Run duration</span>
                                <span className="text-foreground">{status?.agent?.last_run_ms ? `${status.agent.last_run_ms} ms` : 'n/a'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Oracle quorum target</span>
                                <span className="text-foreground">{status?.agent?.config?.minQuorum || 2}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Peer oracles</span>
                                <span className="text-foreground">{status?.agent?.config?.oraclePeers?.length || 0}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Submit Dispute</p>
                            <div className="space-y-2">
                                <select
                                    className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-2 text-sm text-foreground"
                                    value={selectedProposalId ?? ''}
                                    onChange={(e) => setSelectedProposalId(Number(e.target.value))}
                                >
                                    <option value="">Select proposal</option>
                                    {proposals.map((proposal) => (
                                        <option key={proposal.proposal_id} value={proposal.proposal_id}>
                                            #{proposal.proposal_id} {proposal.title.slice(0, 28)}
                                        </option>
                                    ))}
                                </select>
                                <textarea
                                    className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-2 text-sm text-foreground min-h-[84px]"
                                    placeholder="Reason for dispute..."
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                />
                                <Button
                                    size="sm"
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                                    onClick={submitDispute}
                                    disabled={submittingDispute || !selectedProposalId || !disputeReason.trim()}
                                >
                                    <FileWarning className="h-4 w-4 mr-2" />
                                    {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
                                </Button>
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <GlassPanel className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="h-4 w-4 text-cyan-300" />
                            <h2 className="font-semibold text-foreground">On-Chain Attestation Feed</h2>
                        </div>
                        <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                            {attestations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No attestations posted yet.</p>
                            ) : attestations.slice(0, 24).map((attestation, index) => (
                                <div key={`${attestation.proposal_id}-${attestation.oracle_id}-${index}`} className="rounded-md border border-white/10 bg-black/30 p-3 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-foreground font-medium">Proposal #{attestation.proposal_id}</span>
                                        <span className={recommendationStyles[attestation.recommendation] || 'text-slate-300'}>
                                            {attestation.recommendation}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                        oracle: {attestation.oracle_id} • risk: {fmtPct(attestation.risk_score)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-300" />
                            <h2 className="font-semibold text-foreground">Dispute Center</h2>
                        </div>
                        <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                            {disputes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No disputes filed.</p>
                            ) : disputes.slice(0, 20).map((dispute) => (
                                <div key={dispute.dispute_id} className="rounded-md border border-white/10 bg-black/30 p-3 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-foreground font-medium">#{dispute.proposal_id} • {dispute.dispute_id}</span>
                                        <span className={dispute.status === 'open' ? 'text-rose-300' : 'text-emerald-300'}>
                                            {dispute.status === 'open' ? <AlertTriangle className="h-3.5 w-3.5 inline mr-1" /> : <CheckCircle className="h-3.5 w-3.5 inline mr-1" />}
                                            {dispute.status}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">{dispute.reason}</p>
                                    <p className="mt-1 text-muted-foreground">
                                        filer: {dispute.filer_oracle_id} • severity: {dispute.severity}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </Section>
        </div>
    );
};

export default ConsulGovernanceDiplomat;
