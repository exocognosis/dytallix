import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Button } from "../components/ui/Button"
import { Shield, Zap, Globe, Lock, Cpu, Code, Sparkles, Layers, CheckCircle2, Leaf } from "lucide-react"
import { Link } from "react-router-dom"

export function Home() {
    return (
        <>
            {/* Hero Section */}
            <Section className="pt-32 pb-20 md:pt-40 md:pb-32">
                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm animate-fade-in">
                        Dytallix TestNet Live
                        <span className="flex h-2 w-2 rounded-full bg-green-500 ml-2 animate-pulse"></span>
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-full bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 animate-slide-up">
                        Future-Ready. Quantum-Proof. Open-Source.
                    </h1>

                    <p className="max-w-[800px] text-muted-foreground md:text-xl animate-slide-up" style={{ animationDelay: "100ms" }}>
                        Dytallix is an open-source, quantum-secure blockchain built for the future. It combines standardized cryptography with developer-first tools to help you build resilient systems with confidence.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
                        <Button size="lg" className="text-lg px-8 h-14" asChild>
                            <Link to="/build">Start Building</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8 h-14 glass-button" asChild>
                            <Link to="/enterprise">Explore QuantumVault</Link>
                        </Button>
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
                        <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">The QuantumVault Solution</h3>
                        <p className="text-muted-foreground">
                            Native implementation of NIST-standardized Post-Quantum Cryptography (Dilithium, Falcon) ensures long-term security.
                        </p>
                    </GlassPanel>
                </div>
            </Section>

            {/* Capabilities Grid */}
            <Section title="Platform Capabilities" subtitle="Built for performance, security, and scalability.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: Shield, title: "Quantum Security", desc: "Native PQC signatures for all transactions.", color: "text-purple-500", bg: "bg-purple-500/10" },
                        { icon: Cpu, title: "AI Integration", desc: "On-chain AI oracles for risk scoring and fraud detection.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        { icon: Code, title: "WASM Contracts", desc: "High-performance, secure smart contracts in Rust.", color: "text-amber-500", bg: "bg-amber-500/10" },
                        { icon: Globe, title: "Global Scale", desc: "Optimized consensus for high throughput and low latency.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                        { icon: Sparkles, title: "Pure PQC Native", desc: "A standalone L1 with zero legacy debt. A clean break from classical systems.", color: "text-blue-500", bg: "bg-blue-500/10" },
                        { icon: Layers, title: "Modular Architecture", desc: "Customizable execution environments for specialized use cases.", color: "text-indigo-500", bg: "bg-indigo-500/10" },
                        { icon: CheckCircle2, title: "Instant Finality", desc: "Deterministic consensus ensures transactions are irreversible in seconds.", color: "text-rose-500", bg: "bg-rose-500/10" },
                        { icon: Leaf, title: "Eco-Friendly", desc: "Proof-of-Stake consensus minimizes environmental impact.", color: "text-green-500", bg: "bg-green-500/10" },
                    ].map((item, i) => (
                        <GlassPanel key={i} variant="card" className="p-6 flex flex-col items-center text-center space-y-4 hover:bg-white/10 dark:hover:bg-white/5">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </GlassPanel>
                    ))}
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
