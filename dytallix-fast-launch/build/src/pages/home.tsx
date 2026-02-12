import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { FeatureListItem } from "../components/ui/FeatureListItem"
import { Button } from "../components/ui/Button"
import { Shield, Zap, Globe, Lock, Cpu, Code, Sparkles, Layers, CheckCircle2, Leaf, Database } from "lucide-react"
import { Link } from "react-router-dom"

export function Home() {
    return (
        <>
            {/* Hero Section */}
            <Section className="pt-32 pb-16 md:pt-40 md:pb-20">
                {/* Top Badge */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm animate-fade-in">
                        Dytallix TestNet Live
                        <span className="flex h-2 w-2 rounded-full bg-green-500 ml-2 animate-pulse"></span>
                    </div>
                </div>

                {/* Hero Headline */}
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 animate-slide-up mb-12">
                    Future-Ready. Quantum-Proof. Open-Source.
                </h1>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                    {/* Left Column: Video */}
                    <div
                        className="w-full aspect-square rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-slide-up transition-all duration-300 hover:border-white/20 overflow-hidden"
                        style={{ animationDelay: "100ms" }}
                    >
                        <video
                            className="w-full h-full object-cover"
                            controls
                            poster="/dytallix-logo.png"
                        >
                            <source src="/dytallix-intro.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>

                    {/* Right Column: Features + CTAs */}
                    <div className="h-full flex flex-col justify-center animate-slide-up p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5" style={{ animationDelay: "200ms" }}>
                        <div className="space-y-4">
                            <FeatureListItem
                                icon={CheckCircle2}
                                title="Post-Quantum Cryptography"
                                description="NIST-standardized Kyber & Dilithium algorithms protect your data from quantum threats today."
                                color="text-green-500"
                            />
                            <FeatureListItem
                                icon={CheckCircle2}
                                title="Developer-First Tools"
                                description="SDKs, APIs, and comprehensive documentation to build quantum-resilient applications."
                                color="text-green-500"
                            />
                            <FeatureListItem
                                icon={CheckCircle2}
                                title="Open-Source & Transparent"
                                description="Fully auditable codebase with community-driven development and governance."
                                color="text-green-500"
                            />
                            <FeatureListItem
                                icon={CheckCircle2}
                                title="Enterprise Ready"
                                description="QuantumVault provides turnkey security for sensitive enterprise data and digital assets."
                                color="text-green-500"
                            />
                            <FeatureListItem
                                icon={CheckCircle2}
                                title="Dual-Token Economy"
                                description="DGT for governance and staking, DRT for gas and rewards. A sustainable tokenomic model built for long-term growth."
                                color="text-green-500"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center">
                            <Button size="lg" className="text-lg px-8 h-14" asChild>
                                <Link to="/build">Start Building</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="text-lg px-8 h-14 glass-button" asChild>
                                <Link to="/enterprise">Explore QuantumVault</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Threat Brief / HNDL */}
            <Section title="The Quantum Threat is Real" subtitle="Harvest Now, Decrypt Later (HNDL) attacks are already compromising future data security.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <GlassPanel variant="card" className="p-6 space-y-4 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">RSA & ECC Broken</h3>
                        <p className="text-muted-foreground">
                            Shor's algorithm will break current encryption standards. Data encrypted today is vulnerable to future quantum computers.
                        </p>
                    </GlassPanel>
                    <GlassPanel variant="card" className="p-6 space-y-4 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Infrastructure Risk</h3>
                        <p className="text-muted-foreground">
                            Financial systems, critical infrastructure, and blockchain networks relying on classical signatures are at risk of total compromise.
                        </p>
                    </GlassPanel>
                    <GlassPanel variant="card" className="p-6 space-y-4 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Database className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Data Harvesting Attacks</h3>
                        <p className="text-muted-foreground">
                            Adversaries are storing encrypted data today, planning to decrypt it instantly once quantum computers are available. Sensitive information is at risk even if stolen now.
                        </p>
                    </GlassPanel>
                </div>
            </Section>

            {/* The Dytallix Solution */}
            <Section title="The Dytallix Solution" subtitle="Purpose-built defenses against today's Harvest Now, Decrypt Later attacks and tomorrow's direct quantum threats.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: Shield, title: "Quantum Security", desc: "NIST-standardized ML-DSA signatures protect against HNDL attacks harvesting your data today.", color: "text-purple-500", bg: "bg-purple-500/10", threat: "HNDL" },
                        { icon: Cpu, title: "AI Threat Detection", desc: "On-chain oracles identify suspicious patterns before quantum attackers can exploit them.", color: "text-emerald-500", bg: "bg-emerald-500/10", threat: "Both" },
                        { icon: Code, title: "WASM Contracts", desc: "Rust-based smart contracts immune to quantum-vulnerable cryptographic dependencies.", color: "text-amber-500", bg: "bg-amber-500/10", threat: "Direct" },
                        { icon: Globe, title: "Global Scale", desc: "High-throughput consensus ready for mass migration from quantum-vulnerable networks.", color: "text-cyan-500", bg: "bg-cyan-500/10", threat: "Direct" },
                        { icon: Sparkles, title: "Pure PQC Native", desc: "Zero legacy cryptography. No quantum attack surface from inherited vulnerabilities.", color: "text-blue-500", bg: "bg-blue-500/10", threat: "HNDL" },
                        { icon: Layers, title: "Modular Architecture", desc: "Crypto-agile design allows rapid algorithm upgrades as quantum threats evolve.", color: "text-indigo-500", bg: "bg-indigo-500/10", threat: "Both" },
                        { icon: CheckCircle2, title: "Instant Finality", desc: "Transactions are irreversible before quantum computers can attempt key recovery.", color: "text-rose-500", bg: "bg-rose-500/10", threat: "Direct" },
                        { icon: Leaf, title: "Sustainable Security", desc: "Proof-of-Stake consensus ensures long-term viability without energy vulnerabilities.", color: "text-green-500", bg: "bg-green-500/10", threat: "Both" },
                    ].map((item, i) => (
                        <GlassPanel key={i} variant="card" className="p-6 flex flex-col items-center text-center space-y-4 hover:bg-white/10 dark:hover:bg-white/5 relative">
                            <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.threat === 'HNDL' ? 'bg-red-500/20 text-red-400' : item.threat === 'Direct' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {item.threat === 'Both' ? 'HNDL + Direct' : item.threat}
                            </span>
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </GlassPanel>
                    ))}
                </div>

                {/* Quantum Risk CTA */}
                <div className="mt-12">
                    <GlassPanel hoverEffect={true} className="p-8 md:p-12 flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl -mt-32 transition-all group-hover:from-purple-500/30 group-hover:to-blue-500/30"></div>
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <Shield className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="text-3xl font-bold">How Vulnerable Are You?</h3>
                        <p className="text-muted-foreground text-lg max-w-2xl">
                            Assess your organization's exposure to quantum threats. Our Quantum Risk Analysis provides a comprehensive evaluation of your cryptographic vulnerabilities and migration priorities.
                        </p>
                        <Button size="lg" className="gap-2" asChild>
                            <a href="https://dytallix.com/quantumrisk">
                                Get Your Quantum Risk Profile
                                <Zap className="h-4 w-4" />
                            </a>
                        </Button>
                    </GlassPanel>
                </div>
            </Section>

            {/* CTA Split */}
            <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-8 md:p-12 flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                        <h3 className="text-3xl font-bold">For Developers</h3>
                        <p className="text-muted-foreground text-lg">
                            Build the next generation of secure dApps with Rust, WASM, and our comprehensive SDKs.
                        </p>
                        <Button size="lg" asChild>
                            <Link to="/build">Access Developer Hub</Link>
                        </Button>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-8 md:p-12 flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/20"></div>
                        <h3 className="text-3xl font-bold">For Enterprise</h3>
                        <p className="text-muted-foreground text-lg">
                            Secure your organization's digital assets against quantum threats with QuantumVault.
                        </p>
                        <Button size="lg" variant="outline" className="glass-button" asChild>
                            <Link to="/enterprise">Enterprise Solutions</Link>
                        </Button>
                    </GlassPanel>
                </div>
            </Section>
        </>
    )
}
