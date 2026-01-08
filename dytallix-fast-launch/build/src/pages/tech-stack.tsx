import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Shield, Cpu, Network, Code } from "lucide-react"

export function TechStack() {
    const stack = [
        {
            category: "Cryptography",
            icon: Shield,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            techs: [
                { name: "Dilithium5", desc: "Primary signature scheme (NIST Level 5)" },
                { name: "Falcon-1024", desc: "Fast signature verification for high throughput" },
                { name: "Kyber-1024", desc: "Key encapsulation for secure channels" }
            ]
        },
        {
            category: "Consensus & Networking",
            icon: Network,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            techs: [
                { name: "CometBFT", desc: "Tendermint-based BFT consensus engine" },
                { name: "libp2p", desc: "Peer-to-peer networking stack" },
                { name: "gRPC / JSON-RPC", desc: "High-performance API interfaces" }
            ]
        },
        {
            category: "Smart Contracts",
            icon: Code,
            color: "text-green-500",
            bg: "bg-green-500/10",
            techs: [
                { name: "WebAssembly (WASM)", desc: "Portable, secure execution environment" },
                { name: "Rust", desc: "Memory-safe contract language" },
                { name: "Wasmi", desc: "Deterministic WASM interpreter" }
            ]
        },
        {
            category: "AI Integration",
            icon: Cpu,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            techs: [
                { name: "Python Microservices", desc: "Off-chain risk analysis engines" },
                { name: "TensorFlow / PyTorch", desc: "ML model inference" },
                { name: "Oracle Adapters", desc: "Secure on-chain data bridging" }
            ]
        }
    ]

    return (
        <Section title="Technology Stack" subtitle="Built on the most advanced open-source technologies.">
            <div className="space-y-8">
                {stack.map((group, i) => (
                    <GlassPanel key={i} className="p-8">
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                            <div className={`h-16 w-16 rounded-2xl ${group.bg} flex items-center justify-center ${group.color}`}>
                                <group.icon className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold">{group.category}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {group.techs.map((tech, j) => (
                                <GlassPanel key={j} variant="card" hoverEffect={true} className="p-6 flex flex-col items-center text-center h-full">
                                    <h4 className={`font-bold mb-2 ${group.color}`}>{tech.name}</h4>
                                    <p className="text-sm text-muted-foreground">{tech.desc}</p>
                                </GlassPanel>
                            ))}
                        </div>
                    </GlassPanel>
                ))}
            </div>
        </Section>
    )
}
