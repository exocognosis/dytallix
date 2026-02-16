import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    ArrowLeft, BookOpen, TrendingDown, Shield, Hash, Layers,
    FileCheck, Unlock, Lock, Anchor, AreaChart, ClipboardList,
    AlertTriangle, ExternalLink
} from 'lucide-react';

// --- Reusable sub-components ---
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; number: string }> = ({ icon, title, number }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">{icon}</div>
        <h2 className="text-2xl md:text-3xl font-bold">
            <span className="text-muted-foreground mr-2">{number}</span>
            <span className="text-foreground">{title}</span>
        </h2>
    </div>
);

const Formula: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
    <div className="my-4 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm">
        {label && <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>}
        <div className="text-emerald-400">{children}</div>
    </div>
);

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'typescript' }) => (
    <div className="my-4 rounded-lg overflow-hidden border border-white/10">
        <div className="px-4 py-2 bg-white/5 text-xs text-muted-foreground uppercase tracking-wider border-b border-white/10">{language}</div>
        <pre className="p-4 bg-black/40 overflow-x-auto text-xs leading-relaxed"><code className="text-emerald-300/80">{code}</code></pre>
    </div>
);

const ParamTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
    <div className="my-4 overflow-x-auto">
        <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
            <thead>
                <tr className="bg-white/5">
                    {headers.map((h, i) => <th key={i} className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-white/10">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        {row.map((cell, ci) => <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// --- Reusable Deep Dive Content ---
export const C2QDeepDiveContent: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    return (
        <>
                {/* Back Link */}
                {!embedded && (
                    <Link to="/C2QAssetMigration" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors mb-8 group">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Migration Dashboard
                    </Link>
                )}

                {/* Hero */}
                <div className={`text-center max-w-4xl mx-auto ${embedded ? 'mb-10' : 'mb-16'}`}>
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <BookOpen className="w-10 h-10 text-emerald-400" />
                        <h1 className="text-3xl md:text-5xl font-bold">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Mathematical &amp; Economic</span>
                            <br />
                            <span className="text-foreground">Deep Dive</span>
                        </h1>
                    </div>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        A comprehensive exploration of every function, formula, and economic assumption embedded in the
                        C2Q Asset Migration simulation — from sigmoid decay curves to post-quantum re-issuance mechanics.
                    </p>
                </div>

                {/* Table of Contents */}
                <GlassPanel className="p-6 mb-12" hoverEffect>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Table of Contents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            ['01', 'Quantum Decay Function D(t)'],
                            ['02', 'Value Transformation Pipeline'],
                            ['03', 'Cryptographic Primitives'],
                            ['04', 'Asset Classification Framework'],
                            ['05', 'Six‑Step Migration Pipeline'],
                            ['06', 'Decay Timeline Visualization'],
                            ['07', 'Migration Report Metrics'],
                            ['08', 'Assumptions & Limitations'],
                            ['09', 'References & Standards'],
                        ].map(([num, title]) => (
                            <a key={num} href={`#section-${num}`}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                                <span className="text-xs font-mono text-emerald-400/60 group-hover:text-emerald-400 transition-colors">{num}</span>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{title}</span>
                            </a>
                        ))}
                    </div>
                </GlassPanel>

                {/* --- Section 1: Quantum Decay --- */}
                <div className="space-y-12">
                    <div id="section-01">
                        <SectionHeader icon={<TrendingDown className="h-5 w-5" />} title="The Quantum Decay Function — D(t)" number="01" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <h3 className="text-lg font-bold text-foreground mb-3">The Core Formula</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                The simulation models the erosion of classical cryptographic security using a <strong className="text-foreground">sigmoid decay function</strong>.
                                This captures the phase-transition behavior of quantum computing advancement — security doesn't degrade linearly, it collapses rapidly once key engineering thresholds are crossed.
                            </p>
                            <Formula label="Sigmoid Quantum Decay">
                                D(t) = 1 / (1 + e<sup>α · (t − Z<sub>est</sub>)</sup>)
                            </Formula>

                            <ParamTable
                                headers={['Parameter', 'Meaning', 'Default']}
                                rows={[
                                    ['t', 'Time in years from the present', 'User-configurable (1–10)'],
                                    ['α (alpha)', 'Steepness of the decay curve', '1.0'],
                                    ['Z_est', 'Estimated years until CRQC arrives', '5.0'],
                                ]}
                            />

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">What It Models</h3>
                            <div className="space-y-3">
                                {[
                                    ['D(t) → 1', 'when t ≪ Z_est', 'Classical crypto is still secure. The quantum threat is distant.'],
                                    ['D(t) → 0.5', 'when t = Z_est', 'The inflection point — 50% security confidence. This is the critical migration deadline.'],
                                    ['D(t) → 0', 'when t ≫ Z_est', "Classical crypto is broken. Shor's algorithm renders RSA/ECC trivially factorable."],
                                ].map(([val, condition, desc], i) => (
                                    <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02]">
                                        <code className="text-xs font-mono text-emerald-400 whitespace-nowrap mt-0.5">{val}</code>
                                        <div>
                                            <span className="text-xs text-amber-400">{condition}</span>
                                            <p className="text-sm text-muted-foreground">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Why a Sigmoid?</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Quantum computing capability doesn't arrive linearly — it follows an S-curve driven by quantum volume, error correction breakthroughs,
                                and fabrication scaling. The transition from "no practical threat" to "complete classical break" is anticipated to be rapid once key
                                engineering thresholds are crossed. The sigmoid captures this <strong className="text-foreground">phase-transition behavior</strong> mathematically.
                            </p>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Economic Implication</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                The <strong className="text-foreground">quantum vulnerability score</strong> displayed in the simulation is defined as:
                            </p>
                            <Formula label="Vulnerability Score">
                                Vulnerability = (1 − D(t)) × 100%
                            </Formula>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                This directly feeds into the <strong className="text-foreground">risk-adjusted quantum premium</strong> — the additional cost or discount
                                applied during migration to account for the probability that the classical asset's cryptographic backing may already be compromised
                                via Harvest Now, Decrypt Later attacks.
                            </p>

                            <CodeBlock code={`function quantumDecay(t: number, alpha = 1, zEst = 5): number {
    return 1 / (1 + Math.exp(alpha * (t - zEst)));
}`} />
                        </GlassPanel>
                    </div>

                    {/* --- Section 2: Value Transformation Pipeline --- */}
                    <div id="section-02">
                        <SectionHeader icon={<TrendingDown className="h-5 w-5" />} title="Value Transformation Pipeline" number="02" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                The simulation applies a sequential value transformation that models real-world migration economics:
                            </p>
                            <div className="flex items-center gap-2 flex-wrap my-4 text-sm font-mono">
                                {['Classical Value', '→', 'Haircut', '→', 'Demurrage', '→', 'PQC Final Value'].map((item, i) => (
                                    item === '→' ? <span key={i} className="text-emerald-400">→</span> :
                                        <span key={i} className="px-3 py-1.5 rounded bg-white/5 text-foreground border border-white/10">{item}</span>
                                ))}
                            </div>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Step 1: Migration Haircut</h3>
                            <Formula label="Post-Haircut Value">
                                V<sub>post</sub> = V<sub>classical</sub> × (1 − h / 100)
                            </Formula>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                Where <strong className="text-foreground">h</strong> is the haircut percentage (0–50%, user-configurable). The haircut accounts for:
                            </p>
                            <ul className="space-y-2 ml-4 text-sm text-muted-foreground">
                                {[
                                    ['Migration friction', 'operational costs of key rotation, re-attestation, and chain anchoring'],
                                    ['Counterparty risk', 'during the migration window, the asset exists in a transitional state where neither security model fully applies'],
                                    ['Market uncertainty', 'the migrated asset may temporarily trade at a discount until the new PQC framework earns trust'],
                                    ['Oracle repricing', 'real-time price feeds may incorporate quantum risk discounts'],
                                ].map(([title, desc], i) => (
                                    <li key={i} className="flex gap-2"><span className="text-emerald-400 mt-0.5">•</span><span><strong className="text-foreground">{title}</strong> — {desc}</span></li>
                                ))}
                            </ul>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Step 2: Demurrage Adjustment</h3>
                            <Formula label="Demurrage-Adjusted Value">
                                V<sub>adjusted</sub> = V<sub>post</sub> × (1 − d / 100)
                            </Formula>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                Where <strong className="text-foreground">d</strong> is the demurrage rate per period (0–5%, user-configurable). Demurrage is a holding cost
                                that serves as an <strong className="text-foreground">economic incentive mechanism</strong>:
                            </p>
                            <ul className="space-y-2 ml-4 text-sm text-muted-foreground">
                                {[
                                    ['Penalizes procrastination', 'assets left on classical chains lose value each period'],
                                    ['Historical precedent', "mirrors Silvio Gesell's demurrage currency theory, where money loses value over time to encourage circulation"],
                                    ['Creates urgency', 'as the quantum risk horizon shrinks, the compounding cost of delay accelerates'],
                                    ['Funds infrastructure', 'collected demurrage can be directed toward migration subsidies, validator incentives, and security audits'],
                                ].map(([title, desc], i) => (
                                    <li key={i} className="flex gap-2"><span className="text-amber-400 mt-0.5">•</span><span><strong className="text-foreground">{title}</strong> — {desc}</span></li>
                                ))}
                            </ul>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Step 3: Final PQC Value</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                The <strong className="text-emerald-400">PQC Final Value</strong> represents the economic value of the asset after it has been
                                fully migrated, haircut-adjusted, and demurrage-adjusted. This is the value locked under the post-quantum cryptographic framework.
                            </p>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Value Comparison Chart</h3>
                            <ParamTable
                                headers={['Bar', 'Color', 'Meaning']}
                                rows={[
                                    ['Classical Value', '🔴 Red', 'Original value — vulnerable to quantum attack'],
                                    ['Post-Haircut', '🟡 Amber', 'After migration friction costs'],
                                    ['PQC Final Value', '🟢 Green', 'Secured under quantum-resistant cryptography'],
                                ]}
                            />
                        </GlassPanel>
                    </div>

                    {/* --- Section 3: Cryptographic Primitives --- */}
                    <div id="section-03">
                        <SectionHeader icon={<Hash className="h-5 w-5" />} title="Cryptographic Primitives" number="03" />

                        <div className="space-y-6">
                            <GlassPanel className="p-6 md:p-8" hoverEffect>
                                <h3 className="text-lg font-bold text-foreground mb-3">3.1 — Hash Function (FNV-1a Simulation)</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    The simulation generates realistic-looking cryptographic hashes using a custom <strong className="text-foreground">FNV-1a</strong> (Fowler–Noll–Vo)
                                    implementation. This is a <em>deterministic hash stub</em> — not cryptographically secure, but it generates consistent, realistic-looking
                                    66-character hex strings (resembling Ethereum transaction hashes) for visual fidelity.
                                </p>
                                <CodeBlock code={`function pseudoHash(input: string): string {
    let h = 0x811c9dc5;  // FNV offset basis
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);  // FNV prime
    }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return \`0x\${hex}\${hex}\${hex}\${hex}\`.slice(0, 66);
}`} />
                                <p className="text-xs text-muted-foreground italic">
                                    In production: replaced by SHA-256 or SHA-3 for classical hashes and SHAKE-256 for PQC-domain hashing.
                                </p>
                            </GlassPanel>

                            <GlassPanel className="p-6 md:p-8" hoverEffect>
                                <h3 className="text-lg font-bold text-foreground mb-3">3.2 — Shamir's Secret Sharing (k-of-n Threshold)</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    In a real C2Q migration, private keys never exist in a single location. Instead, they are split into <strong className="text-foreground">n</strong> shares
                                    using polynomial interpolation over a finite field, where any <strong className="text-foreground">k</strong> shares can reconstruct the secret
                                    (3-of-5 in the simulation).
                                </p>
                                <CodeBlock code={`function shamirStub(secret: string, n: number, k: number): string[] {
    const shares: string[] = [];
    for (let i = 1; i <= n; i++) {
        shares.push(\`share_\${i}_of_\${n}[t=\${k}]:\${pseudoHash(secret + i).slice(0, 20)}\`);
    }
    return shares;
}`} />
                                <ul className="space-y-2 ml-4 text-sm text-muted-foreground mt-4">
                                    <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><strong className="text-foreground">No single point of compromise</strong> — an attacker must obtain k shares simultaneously</li>
                                    <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><strong className="text-foreground">Fault tolerance</strong> — up to (n − k) share holders can be unavailable</li>
                                    <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><strong className="text-foreground">Governance alignment</strong> — migration requires multi-party consent</li>
                                </ul>
                                <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <p className="text-xs text-blue-300/80 leading-relaxed">
                                        <strong>The mathematics:</strong> Shamir's scheme constructs a random polynomial f(x) of degree k−1 where f(0) = secret.
                                        Each share is a point (i, f(i)) on this polynomial. By Lagrange interpolation, any k points can reconstruct f and recover f(0).
                                    </p>
                                </div>
                            </GlassPanel>
                        </div>
                    </div>

                    {/* --- Section 4: Asset Classification --- */}
                    <div id="section-04">
                        <SectionHeader icon={<Layers className="h-5 w-5" />} title="Asset Classification Framework" number="04" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <h3 className="text-lg font-bold text-foreground mb-3">Category Taxonomy</h3>
                            <ParamTable
                                headers={['Category', 'Asset Types', 'Migration Considerations']}
                                rows={[
                                    ['Real', 'Real Estate, Invoice, Commodity', 'Physical backing; legal novation; oracle price feeds from traditional markets'],
                                    ['Digital', 'NFT, Data Vault', 'Native on-chain; direct key rotation; metadata migration complexity'],
                                    ['Account-based', 'Bank Account, Tokenized Security', 'Regulated; institutional coordination; compliance checkpoints'],
                                    ['Currency', 'Fiat, Crypto (BTC/ETH)', 'High liquidity; exchange-rate sensitivity; cross-chain bridge implications'],
                                ]}
                            />

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Risk Modifiers</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Liquidity', color: 'emerald', desc: 'High-liquidity assets migrate with less slippage. Low-liquidity assets may require extended settlement windows and wider haircuts.' },
                                    { title: 'Volatility', color: 'amber', desc: 'Volatile assets trigger dynamic repricing during migration. Stable assets use fixed-rate settlement.' },
                                    { title: 'Jurisdiction', color: 'blue', desc: 'US (SEC/FinCEN), EU (MiCA), or Global (multi-jurisdictional arbitration). Determines the legal novation pathway.' },
                                    { title: 'Encumbrances', color: 'red', desc: 'Flags existing liens, smart contract dependencies, or cross-collateralization that must be resolved before severance.' },
                                ].map((item) => (
                                    <div key={item.title} className={`p-4 rounded-lg bg-${item.color}-500/5 border border-${item.color}-500/20`}>
                                        <h4 className={`text-sm font-bold text-${item.color}-400 mb-2`}>{item.title}</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>
                    </div>

                    {/* --- Section 5: Six-Step Pipeline --- */}
                    <div id="section-05">
                        <SectionHeader icon={<Shield className="h-5 w-5" />} title="The Six-Step Migration Pipeline" number="05" />
                        <div className="space-y-6">
                            {[
                                {
                                    step: 'Step 1', title: 'Asset Verification', icon: <FileCheck className="h-5 w-5" />,
                                    purpose: 'Establish ground truth about the asset before any migration begins.',
                                    operations: [
                                        'Asset identification and category classification',
                                        'Ownership chain verification via oracle attestation',
                                        'Classical signature validation (ECDSA-secp256k1)',
                                        'Encumbrance check — scans for liens, dependencies, or multi-sig requirements',
                                        'Jurisdictional compliance routing',
                                    ],
                                    assumption: 'Verification must be exhaustive because errors propagate through all subsequent steps. A misclassified asset or undetected encumbrance could result in value loss or legal dispute.'
                                },
                                {
                                    step: 'Step 2', title: 'Classification', icon: <Layers className="h-5 w-5" />,
                                    purpose: 'Risk-score the asset and determine its migration parameters.',
                                    operations: [
                                        'Category assignment (Real, Digital, Account-based, Currency)',
                                        'Liquidity and volatility profiling',
                                        'Quantum vulnerability scoring: (1 − D(t)) × 100%',
                                        'Decay factor calculation',
                                    ],
                                    assumption: 'Classification drives downstream decisions — high-risk, low-liquidity assets receive larger haircuts and longer settlement windows.'
                                },
                                {
                                    step: 'Step 3', title: 'Classical Valuation', icon: <TrendingDown className="h-5 w-5" />,
                                    purpose: "Establish the asset's value under classical assumptions, then apply migration economics.",
                                    operations: [
                                        'Nominal value assessment',
                                        'Haircut application: V_post = V_classical × (1 − h/100)',
                                        'Demurrage adjustment: V_adjusted = V_post × (1 − d/100)',
                                        'Risk-adjusted quantum premium calculation',
                                        "MPC custody valuation via Shamir's Secret Sharing (3-of-5)",
                                    ],
                                    assumption: 'The classical valuation is the last time the asset is priced under the old cryptographic regime. From this point forward, its value is defined by the migration framework.'
                                },
                                {
                                    step: 'Step 4', title: 'Cryptographic Lineage Severance', icon: <Unlock className="h-5 w-5" />,
                                    purpose: "Irrevocably terminate the asset's classical cryptographic identity.",
                                    operations: [
                                        'ECDSA private key binding revocation',
                                        'Classical chain anchor block finalization',
                                        'Complete cryptographic lineage severance — all backward-compatible key derivation paths destroyed',
                                        'Termination receipt generation with timestamp anchor',
                                    ],
                                    assumption: 'This is the point of no return. "Dual-existence" creates arbitrage risks, double-spend vulnerabilities, and regulatory complications. A clean severance — not wrapping — is the only secure approach.'
                                },
                                {
                                    step: 'Step 5', title: 'PQC Re-Issuance', icon: <Lock className="h-5 w-5" />,
                                    purpose: "Create the asset's new quantum-resistant identity.",
                                    operations: [
                                        'PQC keypair generation using ML-DSA-87 (CRYSTALS-Dilithium5) — 2,592 byte public keys',
                                        'Asset re-issuance under PQC framework with new unique token ID',
                                        'ML-KEM-1024 (CRYSTALS-Kyber) encapsulation for custody transfer',
                                        'Post-quantum value lock at the demurrage-adjusted amount',
                                    ],
                                    assumption: 'ML-DSA-87 provides NIST Security Category 5 (AES-256 equivalent) — the highest available, appropriate for long-lived financial assets where compromise is catastrophic.'
                                },
                                {
                                    step: 'Step 6', title: 'Anchoring & Attestation', icon: <Anchor className="h-5 w-5" />,
                                    purpose: 'Finalize the migration by anchoring the PQC asset on the Dytallix chain with governance attestation.',
                                    operations: [
                                        'Broadcast PQC-reissued asset to Dytallix chain',
                                        'Anchor in specific Dytallix block (immutable record)',
                                        'On-chain attestation hash — publicly verifiable migration proof',
                                        'Governance staking verification — operator bond with slash conditions',
                                    ],
                                    assumption: 'Anchoring creates a publicly verifiable record. Governance staking with slashing aligns operator incentives with honest behavior — fraudulent migration costs the operator more than they could gain.'
                                },
                            ].map((step, idx) => (
                                <GlassPanel key={idx} className="p-6 md:p-8" hoverEffect>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">{step.icon}</div>
                                        <div>
                                            <span className="text-xs font-mono text-emerald-400/60">{step.step}</span>
                                            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-4"><strong className="text-foreground">Purpose:</strong> {step.purpose}</p>

                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Operations</h4>
                                    <ul className="space-y-1.5 ml-4 text-sm text-muted-foreground mb-4">
                                        {step.operations.map((op, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span>{op}</li>)}
                                    </ul>

                                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                        <p className="text-xs text-amber-300/80 leading-relaxed"><strong>Economic assumption:</strong> {step.assumption}</p>
                                    </div>
                                </GlassPanel>
                            ))}
                        </div>
                    </div>

                    {/* --- Section 6: Decay Timeline --- */}
                    <div id="section-06">
                        <SectionHeader icon={<AreaChart className="h-5 w-5" />} title="Quantum Decay Timeline Visualization" number="06" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                The area chart on the dashboard shows two competing curves over a 10-year horizon:
                            </p>
                            <ParamTable
                                headers={['Curve', 'Color', 'Formula']}
                                rows={[
                                    ['Classical Security %', '🟢 Green', 'D(t) × 100'],
                                    ['Quantum Risk %', '🔴 Red', '(1 − D(t)) × 100'],
                                ]}
                            />
                            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                                The crossover point (where both curves meet at 50%) represents the estimated arrival of a Cryptographically Relevant Quantum Computer
                                (Z<sub>est</sub> = 5 years by default). Before this point, classical security dominates. After it, quantum risk dominates.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                                The further right the crossover, the more time available for orderly migration.
                                The further left, the more urgent the migration becomes.
                            </p>
                            <Formula label="Chart Formula Annotation">
                                D(t) = 1 / (1 + e<sup>(α · (t − Z<sub>est</sub>))</sup>) &nbsp;|&nbsp; α=1, Z<sub>est</sub>=5
                            </Formula>
                        </GlassPanel>
                    </div>

                    {/* --- Section 7: Report Metrics --- */}
                    <div id="section-07">
                        <SectionHeader icon={<ClipboardList className="h-5 w-5" />} title="Migration Report & Summary Metrics" number="07" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                Upon completion of all six steps, the simulation generates a summary report with four key metrics:
                            </p>
                            <ParamTable
                                headers={['Metric', 'Derivation', 'Indicator']}
                                rows={[
                                    ['Asset', 'The asset type selected by the user', 'White'],
                                    ['Original', 'The classical nominal value (V_classical)', '🔴 Red'],
                                    ['Final PQC Value', 'V_classical × (1 − h/100) × (1 − d/100)', '🟢 Green'],
                                    ['Decay Factor', 'D(t) at the configured risk horizon', '🟡 Amber'],
                                ]}
                            />
                            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                                Together, these four values tell the complete economic story: what the asset was worth, what it costs after migration,
                                and how urgent the migration was given the quantum threat timeline.
                            </p>
                        </GlassPanel>
                    </div>

                    {/* --- Section 8: Assumptions & Limitations --- */}
                    <div id="section-08">
                        <SectionHeader icon={<AlertTriangle className="h-5 w-5" />} title="Key Assumptions & Limitations" number="08" />

                        <div className="space-y-6">
                            <GlassPanel className="p-6 md:p-8" hoverEffect>
                                <h3 className="text-lg font-bold text-foreground mb-4">Assumptions Made</h3>
                                <div className="space-y-3">
                                    {[
                                        ['Single-period demurrage', 'The simulation applies demurrage once. In practice, demurrage compounds over multiple periods, making delay exponentially more costly.'],
                                        ['Fixed haircut', 'The haircut is applied uniformly. In practice, it would vary by asset category, liquidity, and market conditions.'],
                                        ['Deterministic Z_est', 'The quantum risk horizon is treated as a known parameter. In reality, Z_est is itself a probability distribution.'],
                                        ['Instantaneous execution', 'Each step is modeled as a discrete event. In production, steps overlap, require confirmations, and involve real-world latency.'],
                                        ['Universal applicability', 'The same six steps apply to all categories. Real-world assets may require additional legal or regulatory steps.'],
                                    ].map(([title, desc], i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[0.02]">
                                            <span className="text-amber-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            <div>
                                                <strong className="text-foreground text-sm">{title}</strong>
                                                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassPanel>

                            <GlassPanel className="p-6 md:p-8" hoverEffect>
                                <h3 className="text-lg font-bold text-foreground mb-4">What This Simulation Does NOT Model</h3>
                                <ul className="space-y-2 ml-4 text-sm text-muted-foreground">
                                    {[
                                        'Inter-asset dependencies — e.g., a bundle of assets collateralizing a single position',
                                        'Market impact — mass migration could move prices, particularly for low-liquidity assets',
                                        'Cross-chain bridge risks — assumes clean, single-origin-to-single-destination migration',
                                        'Governance disputes — what happens if validators disagree on an attestation',
                                        'Partial migration — the simulation is all-or-nothing; real systems may need partial migration',
                                    ].map((item, i) => <li key={i} className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span>{item}</li>)}
                                </ul>
                            </GlassPanel>

                            <GlassPanel className="p-6 md:p-8 border-emerald-500/20" hoverEffect>
                                <h3 className="text-lg font-bold text-emerald-400 mb-3">Why These Simplifications Are Acceptable</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This is a <strong className="text-foreground">pedagogical simulation</strong> designed to illustrate the economic and cryptographic mechanics
                                    of C2Q migration. The core relationships — sigmoid risk modeling, value transformation through haircuts and demurrage,
                                    cryptographic lineage severance, and PQC re-issuance — are structurally accurate even if specific numerical outputs are simplified.
                                    The goal is <strong className="text-foreground">economic intuition</strong>, not production-grade risk calculation.
                                </p>
                            </GlassPanel>
                        </div>
                    </div>

                    {/* --- Section 9: References --- */}
                    <div id="section-09">
                        <SectionHeader icon={<ExternalLink className="h-5 w-5" />} title="References & Standards" number="09" />
                        <GlassPanel className="p-6 md:p-8" hoverEffect>
                            <ParamTable
                                headers={['Standard', 'Role in Migration']}
                                rows={[
                                    ['NIST FIPS 204', 'ML-DSA (CRYSTALS-Dilithium) — digital signatures'],
                                    ['NIST FIPS 203', 'ML-KEM (CRYSTALS-Kyber) — key encapsulation'],
                                    ['ECDSA secp256k1', 'Classical signature standard being replaced'],
                                    ["Shamir's Secret Sharing", 'Multi-party custody during migration'],
                                    ['FNV-1a', 'Non-cryptographic hash (simulation display only)'],
                                    ['Sigmoid / Logistic Function', 'Quantum threat timeline modeling'],
                                ]}
                            />
                        </GlassPanel>
                    </div>
                </div>

                {/* Footer */}
                {!embedded && (
                    <div className="mt-16 text-center">
                        <Link to="/C2QAssetMigration"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 transition-opacity">
                            <ArrowLeft className="h-4 w-4" />
                            Return to Migration Dashboard
                        </Link>
                    </div>
                )}
        </>
    );
};

// --- Main Component ---
const C2QDeepDive: React.FC = () => {
    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <C2QDeepDiveContent />
            </Section>
        </div>
    );
};

export default C2QDeepDive;
