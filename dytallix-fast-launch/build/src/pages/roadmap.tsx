import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { CheckCircle2, Circle, Clock } from "lucide-react"

export function Roadmap() {
    const phases = [
        {
            phase: "Phase 1: Foundation",
            status: "completed",
            items: [
                "Core Blockchain Implementation (Rust)",
                "PQC Integration (Dilithium/Falcon)",
                "Basic Consensus Mechanism",
                "Internal Testnet Launch"
            ]
        },
        {
            phase: "Phase 2: Fast Launch (Current)",
            status: "active",
            items: [
                "Public Testnet Deployment",
                "WASM Smart Contract Runtime",
                "Developer SDK & CLI Tools",
                "Explorer & Faucet Release",
                "Initial Governance Framework"
            ]
        },
        {
            phase: "Phase 3: Ecosystem Growth",
            status: "upcoming",
            items: [
                "Cross-Chain Bridge (IBC)",
                "AI Oracle Integration Beta",
                "Advanced Staking Mechanics",
                "Security Audits & Bug Bounty"
            ]
        },
        {
            phase: "Phase 4: Mainnet",
            status: "upcoming",
            items: [
                "Genesis Block Launch",
                "Token Generation Event (TGE)",
                "Full Decentralized Governance",
                "Enterprise Partnerships Live"
            ]
        }
    ]

    return (
        <Section title="Roadmap" subtitle="Our journey to a quantum-secure future.">
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {phases.map((phase, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {phase.status === "completed" ? (
                                <CheckCircle2 className="text-green-500 w-6 h-6" />
                            ) : phase.status === "active" ? (
                                <div className="relative flex items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <Circle className="text-blue-500 w-6 h-6 fill-blue-500" />
                                </div>
                            ) : (
                                <Clock className="text-muted-foreground w-6 h-6" />
                            )}
                        </div>
                        <GlassPanel hoverEffect={true} className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 space-y-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-lg">{phase.phase}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${phase.status === "completed" ? "bg-green-500/10 text-green-500" :
                                    phase.status === "active" ? "bg-blue-500/10 text-blue-500" :
                                        "bg-slate-500/10 text-slate-500"
                                    }`}>
                                    {phase.status}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {phase.items.map((item, j) => (
                                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/20 shrink-0"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </GlassPanel>
                    </div>
                ))}
            </div>
        </Section>
    )
}
