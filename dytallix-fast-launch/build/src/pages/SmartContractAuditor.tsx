import React, { useState } from 'react';
import { Section } from '../components/layout/section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Code, Shield, AlertTriangle, CheckCircle, Play, Loader2 } from 'lucide-react';

interface AuditResult {
    score: number;
    contract_hash: string;
    model_id: string;
    issues: string[];
    ts: number;
    signature: string;
}

const SmartContractAuditor: React.FC = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAudit = async () => {
        if (!code.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Generate a simple hash for the contract (mocking client-side hashing)
            const hash = '0x' + Array.from(code).reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0).toString(16);

            const response = await fetch('http://localhost:7001/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contract_code: code,
                    contract_hash: hash
                }),
            });

            if (!response.ok) {
                throw new Error('Audit service failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error(err);
            setError('Failed to connect to AI Auditor service. Please ensure the service is running.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.9) return 'text-green-500';
        if (score >= 0.7) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 0.9) return 'Safe';
        if (score >= 0.7) return 'Warning';
        return 'Critical';
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-green-500/10 text-green-500 mb-6">
                        <Code className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Smart Contract <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Auditor</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        AI-driven static analysis verified by Post-Quantum Cryptography.
                        Paste your Solidity code below to detect vulnerabilities.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <GlassPanel className="p-6 flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Code className="w-4 h-4 text-muted-foreground" />
                                Source Code
                            </h3>
                            <Button
                                onClick={handleAudit}
                                disabled={loading || !code.trim()}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Auditing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Audit
                                    </>
                                )}
                            </Button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Paste your Solidity contract here..."
                            className="flex-1 w-full bg-black/20 border border-white/10 rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50"
                            spellCheck={false}
                        />
                    </GlassPanel>

                    {/* Results Section */}
                    <div className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        {!result && !error && (
                            <GlassPanel className="h-[600px] flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                                <Shield className="w-16 h-16 mb-4 opacity-20" />
                                <p>Ready to audit. Submit your contract code to begin analysis.</p>
                            </GlassPanel>
                        )}

                        {result && (
                            <>
                                {/* Score Card */}
                                <GlassPanel className="p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />

                                    <h3 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-2">Safety Score</h3>
                                    <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.score)}`}>
                                        {(result.score * 100).toFixed(0)}%
                                    </div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${result.score >= 0.9 ? 'bg-green-500/10 text-green-500' :
                                            result.score >= 0.7 ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-red-500/10 text-red-500'
                                        }`}>
                                        {getScoreLabel(result.score)}
                                    </div>
                                </GlassPanel>

                                {/* Issues List */}
                                <GlassPanel className="p-6 flex-1">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                        Detected Issues
                                    </h3>

                                    {result.issues.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-green-500">
                                            <CheckCircle className="w-12 h-12 mb-4" />
                                            <p className="font-medium">No vulnerabilities detected</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {result.issues.map((issue, idx) => (
                                                <div key={idx} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-3">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                                    <span className="text-sm text-foreground/90">{issue}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </GlassPanel>

                                {/* Verification Badge */}
                                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-green-500" />
                                        <div>
                                            <div className="text-sm font-medium text-green-500">Verified by AI Oracle</div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                Sig: {result.signature.substring(0, 16)}...
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Model: {result.model_id}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default SmartContractAuditor;
