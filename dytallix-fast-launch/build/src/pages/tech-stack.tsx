import { useState } from "react"
import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import {
    Layers, ChevronLeft, ChevronRight, CheckCircle, Clock, FlaskConical
} from "lucide-react"
import { stack } from "../data/tech-stack"
import type { StackCategory, Tech } from "../data/tech-stack"

/* ─── Architecture Layers ────────────────────────────────────── */

const archLayers = [
    { label: "Application Layer", sub: "Wallets, Explorer, dApps", color: "from-pink-500/20 to-pink-500/5", text: "text-pink-400" },
    { label: "Smart Contract Runtime", sub: "WASM + Rust + Wasmi", color: "from-green-500/20 to-green-500/5", text: "text-green-400" },
    { label: "AI & Oracle Layer", sub: "ML Inference + Attested Feeds", color: "from-orange-500/20 to-orange-500/5", text: "text-orange-400" },
    { label: "Consensus Engine", sub: "CometBFT + PQC Vote Extensions", color: "from-purple-500/20 to-purple-500/5", text: "text-purple-400" },
    { label: "Networking", sub: "libp2p + Kyber-wrapped Noise", color: "from-indigo-500/20 to-indigo-500/5", text: "text-indigo-400" },
    { label: "Cryptographic Foundation", sub: "Dilithium-5 · Falcon-1024 · Kyber-1024", color: "from-blue-500/20 to-blue-500/5", text: "text-blue-400" },
]

/* ─── Status Badge ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: Tech["status"] }) {
    const styles = {
        production: "bg-green-500/10 text-green-400 border-green-500/20",
        beta: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        planned: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    }
    const icons = {
        production: <CheckCircle className="w-3 h-3" />,
        beta: <FlaskConical className="w-3 h-3" />,
        planned: <Clock className="w-3 h-3" />,
    }
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status]}`}>
            {icons[status]}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

/* ─── Tech Card (always expanded) ────────────────────────────── */

function TechCard({ tech, accentColor }: { tech: Tech; accentColor: string }) {
    return (
        <GlassPanel variant="card" className="p-5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
                <h4 className={`font-bold text-base ${accentColor}`}>{tech.name}</h4>
                <StatusBadge status={tech.status} />
            </div>
            <p className="text-xs text-muted-foreground mb-3">{tech.desc}</p>

            {/* Details */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                {tech.details}
            </p>

            {/* Specs table */}
            <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                <table className="w-full text-xs">
                    <tbody>
                        {tech.specs.map((spec, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                                <td className="px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{spec.label}</td>
                                <td className={`px-3 py-2 font-mono ${accentColor}`}>{spec.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassPanel>
    )
}

/* ─── Category Slide ─────────────────────────────────────────── */

function CategorySlide({ group }: { group: StackCategory }) {
    return (
        <div className="h-full flex flex-col">
            {/* Category Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`h-12 w-12 rounded-xl ${group.bg} flex items-center justify-center ${group.color} shrink-0`}>
                    <group.icon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">{group.category}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{group.blurb}</p>
                </div>
            </div>

            {/* Tech Cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
                {group.techs.map((tech, j) => (
                    <TechCard key={j} tech={tech} accentColor={group.color} />
                ))}
            </div>
        </div>
    )
}

/* ─── Page Component ─────────────────────────────────────────── */

export function TechStack() {
    const [activeSlide, setActiveSlide] = useState(0)

    const prev = () => setActiveSlide(i => (i === 0 ? stack.length - 1 : i - 1))
    const next = () => setActiveSlide(i => (i === stack.length - 1 ? 0 : i + 1))

    return (
        <Section
            title="Technology Stack"
            subtitle="Dytallix is built on the most advanced open-source, PQC technologies. From the cryptographic foundation to the developer tools in your hands All. It's all intended to let you build with confidence."
            className="pt-32"
        >
            {/* Architecture Overview */}
            <GlassPanel className="p-6 mb-10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold">Architecture Overview</h3>
                        <p className="text-xs text-muted-foreground">How the layers of the Dytallix network fit together</p>
                    </div>
                </div>
                <div className="space-y-1.5">
                    {archLayers.map((layer, i) => (
                        <div
                            key={i}
                            className={`rounded-lg bg-gradient-to-r ${layer.color} border border-white/5 px-4 py-2.5 flex items-center justify-between`}
                        >
                            <div>
                                <span className={`font-semibold text-sm ${layer.text}`}>{layer.label}</span>
                                <span className="text-xs text-muted-foreground ml-3 hidden sm:inline">{layer.sub}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono opacity-50">L{archLayers.length - i}</span>
                        </div>
                    ))}
                </div>
            </GlassPanel>

            {/* Carousel */}
            <GlassPanel className="p-8">
                {/* Navigation header */}
                <div className="flex items-center justify-between mb-6">
                    {/* Dot indicators */}
                    <div className="flex items-center gap-2">
                        {stack.map((group, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveSlide(i)}
                                className={`transition-all duration-300 rounded-full ${i === activeSlide
                                    ? `h-3 w-8 ${group.bg} ${group.border} border`
                                    : "h-3 w-3 bg-white/10 hover:bg-white/20"
                                    }`}
                                title={group.category}
                            />
                        ))}
                    </div>

                    {/* Prev / Next */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                            {activeSlide + 1} / {stack.length}
                        </span>
                        <button
                            onClick={prev}
                            className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={next}
                            className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Slide content */}
                <div className="relative overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                        {stack.map((group, i) => (
                            <div key={i} className="w-full shrink-0 px-1">
                                <CategorySlide group={group} />
                            </div>
                        ))}
                    </div>
                </div>
            </GlassPanel>
        </Section>
    )
}
