import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Check, X, AlertTriangle, Ghost, Zap, Shield, TrendingUp, Globe } from "lucide-react"

export function Investor() {
    return (
        <>
            <Section className="pt-32 pb-12">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500">
                        Dytallix Investor Brief
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Post-Quantum Secure. AI-Enhanced. Future-Proof Infrastructure.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm font-mono text-muted-foreground">
                        <span>www.dytallix.com</span>
                        <span>|</span>
                        <span>hello@dytallix.com</span>
                    </div>
                </div>
            </Section>

            <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GlassPanel hoverEffect={true} className="p-6 space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase">Stage</h3>
                        <p className="text-xl font-bold">Pre-seed / Testnet</p>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase">Funding Sought</h3>
                        <p className="text-xl font-bold text-green-400">$20,000 – $40,000</p>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase">Instrument</h3>
                        <p className="text-lg font-medium">SAFE + Token Warrant</p>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase">Focus</h3>
                        <p className="text-lg font-medium">Testnet & Dev Outreach</p>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="Executive Summary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-8 space-y-4">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Globe className="text-blue-500" /> Overview
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Dytallix is a post-quantum secure, AI-enhanced blockchain platform designed to survive and thrive in the coming wave of quantum computing. While most blockchains are vulnerable to quantum attacks on classical encryption, Dytallix is engineered from the ground up to be resistant to them — leveraging cryptographic primitives like Kyber and Dilithium, combined with a modular AI governance and automation stack.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            This is a strategic early-stage entry point into a project with unusually high resilience and relevance for the future of digital infrastructure.
                        </p>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-8 space-y-4">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" /> The Problem: Q-Day
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Most blockchains today rely on signature algorithms (ECDSA, EdDSA) that can be broken by future quantum computers. This "Q-Day" represents a catastrophic vulnerability for digital assets, sovereign wealth, and critical infrastructure.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Bad actors are already harvesting encrypted data to decrypt later. While the world worries about AGI, this cryptographic collapse is a concrete mathematical inevitability that Dytallix addresses head-on.
                        </p>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="The Solution">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassPanel hoverEffect={true} className="p-6 space-y-4">
                        <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Post-Quantum Layer</h3>
                        <p className="text-muted-foreground">
                            Wallets, validators, and transaction signing all use NIST-standardized quantum-resistant algorithms (Kyber/Dilithium) natively.
                        </p>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-4">
                        <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">AI Modules</h3>
                        <p className="text-muted-foreground">
                            Automate smart contract governance, validator behavior analysis, fraud detection, and economic tuning using on-chain intelligence.
                        </p>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-4">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Deflationary Tokenomics</h3>
                        <p className="text-muted-foreground">
                            Dual-token model (DGT governance, DRT rewards) with burn-based deflation and quadratic voting mechanisms.
                        </p>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="Business Model & Revenue">
                <GlassPanel hoverEffect={true} className="p-8 space-y-6">
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-primary mb-2">QuantumVault MVP & Enterprise Strategy</h3>
                        <p className="text-lg">
                            The QuantumVault product is in MVP mode and currently being marketed to high-growth, forward-looking organizations in multiple strategic market verticals. This flagship product has the potential to earn <strong>$1M ARR in Year 1</strong>.
                        </p>
                        <p className="mt-2 text-muted-foreground">
                            The faster the AI modules are readied and brought to market, the faster more revenue is realized.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-lg font-bold mb-4">Revenue Streams</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>AI Services:</strong> On-chain automation and data feeds paid in DRT.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>Bridge Fees:</strong> DRT burns for all cross-chain usage.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>Enterprise Licensing:</strong> For wallets, key vaults, or ZK ID systems.</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold mb-4">Scalable AI Modules</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>AI Governance Engine:</strong> Automated proposal scoring for DAOs.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>Risk + Fraud Detection:</strong> Compliance for exchanges/DeFi.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                    <span><strong>Cross-Chain Optimizer:</strong> Intelligent transaction routing.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </GlassPanel>
            </Section>

            <Section title="Competitive Landscape">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 font-bold text-muted-foreground">Project / Org</th>
                                <th className="p-4 font-bold text-muted-foreground">Status</th>
                                <th className="p-4 font-bold text-muted-foreground">PQC Live?</th>
                                <th className="p-4 font-bold text-muted-foreground">AI Enhancement?</th>
                                <th className="p-4 font-bold text-muted-foreground">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <tr className="bg-white/5 hover:bg-white/10 transition-colors">
                                <td className="p-4 font-bold">Dytallix</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-green-400"><Check className="h-4 w-4" /> Live testnet + faucet</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-green-400"><Check className="h-4 w-4" /></span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-green-400"><Check className="h-4 w-4" /> Core AI module suite</span></td>
                                <td className="p-4 text-sm text-muted-foreground">One of the first public PQC testnets + AI-enhanced infrastructure</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="p-4">Ethereum</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-blue-400">Research only</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-amber-400"><AlertTriangle className="h-4 w-4" /> Early-stage zk + AI</span></td>
                                <td className="p-4 text-sm text-muted-foreground">Considering PQC but no active fork; scattered AI research at L2</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="p-4">Bitcoin (Forks)</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400">Dormant</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4 text-sm text-muted-foreground">Legacy forks (e.g., Quantum Bitcoin) have no AI plans</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="p-4">QANplatform</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /> Delayed</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-amber-400"><AlertTriangle className="h-4 w-4" /> Claims AI-ready</span></td>
                                <td className="p-4 text-sm text-muted-foreground">Marketing-heavy, no public testnet or ecosystem yet</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="p-4">QRL</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-amber-400">Stagnant</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-green-400"><Check className="h-4 w-4" /> (XMSS)</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4 text-sm text-muted-foreground">Technically live PQC mainnet, but no AI plans, low adoption</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="p-4">IBM / Google</td>
                                <td className="p-4"><span className="flex items-center gap-2 text-gray-400"><Ghost className="h-4 w-4" /> Proprietary</span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-red-400"><X className="h-4 w-4" /></span></td>
                                <td className="p-4"><span className="flex items-center gap-2 text-green-400"><Check className="h-4 w-4" /> (Internal)</span></td>
                                <td className="p-4 text-sm text-muted-foreground">Academic/enterprise R&D — not accessible to devs</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Projected Returns">
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">Potential Projected Earning for Early Stage Investors</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 font-bold">Year</th>
                                    <th className="p-4 font-bold">Est. Token Liquidity</th>
                                    <th className="p-4 font-bold">Price Estimate</th>
                                    <th className="p-4 font-bold">Est. Return on Warrant</th>
                                    <th className="p-4 font-bold">Secondary Rewards</th>
                                    <th className="p-4 font-bold">Total Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono">1</td>
                                    <td className="p-4 text-muted-foreground">None</td>
                                    <td className="p-4 text-muted-foreground">-</td>
                                    <td className="p-4 font-mono">$0.00</td>
                                    <td className="p-4 font-mono">$50K–$150K grants</td>
                                    <td className="p-4 font-bold text-green-400">$50K–$150K</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono">2</td>
                                    <td className="p-4">2–5M DGT</td>
                                    <td className="p-4 font-mono">$0.03–$0.06</td>
                                    <td className="p-4 font-mono">$60K–$300K</td>
                                    <td className="p-4 font-mono">$50K–$150K</td>
                                    <td className="p-4 font-bold text-green-400">$100K–$450K</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono">3</td>
                                    <td className="p-4">10–20M DGT</td>
                                    <td className="p-4 font-mono">$0.07–$0.15</td>
                                    <td className="p-4 font-mono">$700K–$3M</td>
                                    <td className="p-4 font-mono">$100K–$300K</td>
                                    <td className="p-4 font-bold text-green-400">$800K–$3.3M</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            <Section title="Use of Funds">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-6">
                        <h3 className="text-xl font-bold mb-4 text-blue-400">1. Testnet Deployment (~$10K–$20K)</h3>
                        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                            <li>Node infrastructure (Hetzner, backups, monitoring)</li>
                            <li>Validator coordination and setup</li>
                            <li>Wallet + faucet + block explorer development</li>
                            <li>Public launch with telemetry and analytics</li>
                        </ul>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">2. Developer Outreach (~$10K–$20K)</h3>
                        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                            <li>Incentive fund for early smart contract builders</li>
                            <li>Bounties for contributors, validators, security testers</li>
                            <li>Community Discord and site content</li>
                            <li>Twitter/X marketing and GitHub visibility boosts</li>
                        </ul>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="Tokenomics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-6 border-l-4 border-l-primary">
                        <h3 className="text-xl font-bold mb-2">DGT — Governance Token</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• 1,000,000,000 total fixed supply</li>
                            <li>• 15% reserved for development team (vested 4 years)</li>
                            <li>• 40% community treasury</li>
                            <li>• 25% staking rewards</li>
                        </ul>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 border-l-4 border-l-secondary">
                        <h3 className="text-xl font-bold mb-2">DRT — Reward Token</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Inflationary (5% annually)</li>
                            <li>• Earned through staking & usage</li>
                            <li>• Burned automatically through transactions & AI services</li>
                        </ul>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="Investor Terms & Exit">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-6 space-y-4">
                        <h3 className="text-xl font-bold">Investment Structure</h3>
                        <p className="text-muted-foreground">We are open to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>SAFE with optional token warrant</li>
                            <li>Convertible instrument with early liquidity event clause</li>
                            <li>Revenue-sharing on AI modules or validator nodes</li>
                            <li>Discounted early access to token allocations</li>
                        </ul>
                    </GlassPanel>
                    <GlassPanel hoverEffect={true} className="p-6 space-y-4">
                        <h3 className="text-xl font-bold">Exit Paths</h3>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Token appreciation (DGT/DRT exchange listings)</li>
                            <li>Revenue-sharing model (for early warrant holders)</li>
                            <li>Acquisition or integration (e.g., LayerZero, Zama, Avalanche)</li>
                        </ul>
                    </GlassPanel>
                </div>
            </Section>

            <Section className="pb-32">
                <GlassPanel hoverEffect={true} className="p-8 md:p-12 text-center space-y-6 bg-gradient-to-b from-primary/5 to-transparent">
                    <h2 className="text-3xl font-bold">Final Thoughts</h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Dytallix is early — but positioned exactly where the market will eventually be forced to go. It’s building the infrastructure after the storm — not before it.
                    </p>
                    <p className="text-lg font-medium">
                        This isn’t about hype. It’s about inevitability. Let’s build it before they need it.
                    </p>
                    <div className="pt-8">
                        <a href="mailto:hello@dytallix.com" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
                            Contact Us
                        </a>
                    </div>
                </GlassPanel>
            </Section>
        </>
    )
}
