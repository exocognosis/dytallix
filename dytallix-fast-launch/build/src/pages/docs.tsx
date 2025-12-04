import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Book, Code, Terminal, Shield, Cpu, Network, FileText, Download, Users, MessageSquare, Github, Activity } from "lucide-react"

export function Docs() {
    const categories = [
        {
            title: "Getting Started",
            icon: Book,
            items: ["Introduction", "Quickstart Guide", "Architecture Overview", "Glossary"],
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Smart Contracts",
            icon: Code,
            items: ["WASM Runtime", "Rust SDK", "Contract Standards", "Deployment Guide"],
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Node Operations",
            icon: Terminal,
            items: ["Running a Validator", "CLI Reference", "Configuration", "Monitoring"],
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Cryptography",
            icon: Shield,
            items: ["Dilithium Signatures", "Falcon Keys", "Key Management", "Security Model"],
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "API Reference",
            icon: Network,
            items: ["RPC Endpoints", "WebSocket Events", "SDK Methods", "Errors"],
            color: "text-cyan-500",
            bg: "bg-cyan-500/10"
        },
        {
            title: "AI Integration",
            icon: Cpu,
            items: ["Oracle Service", "Risk Scoring", "Fraud Detection", "Model Registry"],
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        }
    ]

    return (
        <>
            <Section title="Documentation" subtitle="Technical guides and references for the Dytallix ecosystem.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat, i) => (
                        <GlassPanel key={i} variant="card" className="p-6 space-y-4 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${cat.bg} ${cat.color}`}>
                                    <cat.icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-lg">{cat.title}</h3>
                            </div>
                            <ul className="space-y-2">
                                {cat.items.map((item, j) => (
                                    <li key={j} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </GlassPanel>
                    ))}
                </div>
            </Section>

            <Section className="pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Popular Guides */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <FileText className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-xl">Popular Guides</h3>
                        </div>
                        <div className="space-y-4">
                            <a href="#" className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <h4 className="font-medium group-hover:text-blue-400 transition-colors">Validator Setup</h4>
                                <p className="text-sm text-muted-foreground mt-1">Step-by-step guide to running a node.</p>
                            </a>
                            <a href="#" className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <h4 className="font-medium group-hover:text-blue-400 transition-colors">Token Standards</h4>
                                <p className="text-sm text-muted-foreground mt-1">Implementing QRC-20 and QRC-721.</p>
                            </a>
                            <a href="#" className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <h4 className="font-medium group-hover:text-blue-400 transition-colors">Migration Guide</h4>
                                <p className="text-sm text-muted-foreground mt-1">Moving from EVM to QuantumVault.</p>
                            </a>
                        </div>
                    </div>

                    {/* SDKs & Tools */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Download className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-xl">SDKs & Tools</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">Rust SDK</span>
                                    <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">v1.0.4</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">Core bindings for smart contract development.</p>
                                <button className="text-sm text-amber-500 hover:text-amber-400 font-medium">View on Crates.io &rarr;</button>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">TypeScript SDK</span>
                                    <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">v2.1.0</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">Client-side libraries for dApp integration.</p>
                                <button className="text-sm text-blue-500 hover:text-blue-400 font-medium">View on NPM &rarr;</button>
                            </div>

                        </div>
                    </div>

                    {/* Community & Support */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Users className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-xl">Community</h3>
                        </div>
                        <div className="space-y-4">
                            <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                                <MessageSquare className="h-6 w-6 text-indigo-400" />
                                <div>
                                    <h4 className="font-medium">Discord Server</h4>
                                    <p className="text-sm text-muted-foreground">Join 15k+ developers.</p>
                                </div>
                            </a>
                            <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                                <Github className="h-6 w-6 text-white" />
                                <div>
                                    <h4 className="font-medium">GitHub Discussions</h4>
                                    <p className="text-sm text-muted-foreground">Propose RFCs and report bugs.</p>
                                </div>
                            </a>
                            <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                                <Activity className="h-6 w-6 text-green-400" />
                                <div>
                                    <h4 className="font-medium">Network Status</h4>
                                    <p className="text-sm text-muted-foreground">Real-time uptime monitoring.</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    )
}
