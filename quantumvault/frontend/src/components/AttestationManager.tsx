import React, { useEffect, useState } from 'react';
import { getJobs, createAttestationJob, Job } from '../api/client';
import { ShieldCheck, RefreshCw, Plus, Link, CheckCircle2, XCircle, Clock, FileJson, Hash } from 'lucide-react';
import clsx from 'clsx';

const AttestationManager: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [anchorId, setAnchorId] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            setLoading(true);
            const data = await getJobs();
            setJobs(data.jobs || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!anchorId) return;

        try {
            setCreating(true);
            setError(null);
            await createAttestationJob(anchorId);
            setAnchorId('');
            loadJobs();
        } catch (err) {
            setError('Failed to create attestation job');
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'FAILED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'PENDING':
            case 'RUNNING': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" />;
            case 'FAILED': return <XCircle className="w-4 h-4" />;
            case 'PENDING':
            case 'RUNNING': return <RefreshCw className="w-4 h-4 animate-spin" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Blockchain Attestation
                </h1>
                <p className="text-slate-400 mt-1">
                    Anchor security proofs to the Dytallix blockchain
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Create Job Card */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm sticky top-8">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                            <Link className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">New Attestation</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Create a permanent, verifiable record of an Encryption Anchor's state on-chain.
                        </p>

                        <form onSubmit={handleCreateJob} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-400">Anchor ID</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={anchorId}
                                        onChange={(e) => setAnchorId(e.target.value)}
                                        placeholder="UUID"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Job
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Job History */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-slate-400" />
                                Job History
                            </h3>
                            <button onClick={loadJobs} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {loading && jobs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">Loading jobs...</div>
                            ) : jobs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No attestation jobs found</div>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{job.job_type}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                    ID: {job.id}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-0.5">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                getStatusStyles(job.status)
                                            )}>
                                                {getStatusIcon(job.status)}
                                                {job.status}
                                            </span>
                                            <button className="opacity-0 group-hover:opacity-100 text-sm text-blue-400 hover:text-blue-300 font-medium transition-all">
                                                View Tx
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttestationManager;
