import React, { useEffect, useState } from 'react';
import { getJobs, createAttestationJob } from '../../services/quantumVaultClient';

const AttestationManager = () => {
    const [jobs, setJobs] = useState([]);
    const [anchorId, setAnchorId] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            setLoading(true);
            const data = await getJobs();
            // The API returns { jobs: [...] }
            setJobs(data.jobs || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
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

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
                <h3 className="text-xl font-bold mb-4">New Attestation Job</h3>
                <form onSubmit={handleCreateJob} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 muted">Anchor ID</label>
                        <input
                            type="text"
                            value={anchorId}
                            onChange={(e) => setAnchorId(e.target.value)}
                            placeholder="UUID of the Encryption Anchor"
                            className="w-full p-2 bg-black/20 border border-white/10 rounded focus:border-primary-500 outline-none font-mono"
                            required
                        />
                        <p className="text-xs muted mt-1">
                            Enter the ID of an existing Encryption Anchor to attest on-chain.
                        </p>
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        disabled={creating}
                        className="btn btn-primary w-full"
                    >
                        {creating ? 'Creating...' : 'Create Job'}
                    </button>
                </form>
            </div>

            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Recent Jobs</h3>
                    <button onClick={loadJobs} className="btn btn-secondary btn-sm">Refresh</button>
                </div>
                <div className="overflow-y-auto max-h-[300px]">
                    {loading && jobs.length === 0 ? (
                        <div className="text-center muted py-4">Loading...</div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center muted py-4">No jobs found</div>
                    ) : (
                        <div className="space-y-2">
                            {jobs.map((job) => (
                                <div key={job.id} className="p-3 border border-white/10 rounded bg-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-sm">{job.job_type}</div>
                                            <div className="text-xs muted font-mono">{job.id}</div>
                                            <div className="text-xs muted">{new Date(job.created_at).toLocaleString()}</div>
                                        </div>
                                        <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'COMPLETED': return 'badge-success';
        case 'FAILED': return 'badge-danger';
        case 'PENDING':
        case 'RUNNING': return 'badge-warning';
        default: return 'badge-neutral';
    }
};

export default AttestationManager;
