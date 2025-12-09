import React, { useState } from 'react';
import { Section } from '../components/layout/section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Lock, Shield, AlertTriangle, CheckCircle, Play, Loader2, Scale, FileText, Zap } from 'lucide-react';

interface AuditResult {
    score: number;
    contract_hash: string;
    model_id: string;
    issues: string[];
    ts: number;
    signature: string;
}

const Garrison: React.FC = () => {
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
            setError('Failed to connect to Garrison service. Please ensure the service is running.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.9) return 'text-teal-500';
        if (score >= 0.7) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 0.9) return 'Compliant';
        if (score >= 0.7) return 'Warning';
        return 'Non-Compliant';
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-500/10 text-teal-500 mb-6">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Garrison <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-600">Compliance</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Automated Compliance & Security for Smart Contracts.
                        Verified on-chain with Post-Quantum Cryptography.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
                    {/* Input Section */}
                    <GlassPanel className="p-6 flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Source Code
                            </h3>
                            <Button
                                onClick={handleAudit}
                                disabled={loading || !code.trim()}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Compliance Check
                                    </>
                                )}
                            </Button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Paste your Solidity contract here..."
                            className="flex-1 w-full bg-black/20 border border-white/10 rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50"
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
                                <p>Ready to analyze. Submit your contract code to verify compliance.</p>
                            </GlassPanel>
                        )}

                        {result && (
                            <>
                                {/* Score Card */}
                                <GlassPanel className="p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />

                                    <h3 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-2">Compliance Score</h3>
                                    <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.score)}`}>
                                        {(result.score * 100).toFixed(0)}%
                                    </div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${result.score >= 0.9 ? 'bg-teal-500/10 text-teal-500' :
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
                                        Compliance Violations
                                    </h3>

                                    {result.issues.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-teal-500">
                                            <CheckCircle className="w-12 h-12 mb-4" />
                                            <p className="font-medium">No violations detected</p>
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
                                <div className="p-4 rounded-lg border border-teal-500/20 bg-teal-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-teal-500" />
                                        <div>
                                            <div className="text-sm font-medium text-teal-500">Verified by Garrison</div>
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

                {/* Info Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassPanel className="p-6">
                        <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 mb-4">
                            <Play className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Usage Guidance</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Paste your Solidity contract code into the editor. Garrison automatically detects the compiler version and analyzes the code against elected compliance frameworks.
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                            <li>Supports Solidity 0.5.x - 0.8.x</li>
                            <li>Detects reentrancy & overflow</li>
                            <li>Checks ERC-20/721 compliance</li>
                        </ul>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Technical Specs</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Garrison combines static analysis with symbolic execution to explore all possible execution paths.
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Signature</span>
                                <span className="font-mono text-foreground">ML-DSA-87</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Verification</span>
                                <span className="text-foreground">NIST Level 5</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Latency</span>
                                <span className="text-foreground">~850ms</span>
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                            <Scale className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Compliance Integration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Garrison maps code behavior regulatory requirements, helping projects stay compliant across jurisdictions.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 font-medium">MiCA</span>
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 font-medium">GDPR</span>
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 font-medium">OFAC</span>
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500 font-medium">KYC/AML</span>
                        </div>
                    </GlassPanel>
                </div>
            </Section>
        </div>
    );
};

export default Garrison;
