import { Link } from "react-router-dom"
import { ArrowRight, Building2, ShieldCheck, Users } from "lucide-react"
import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Button } from "../components/ui/Button"

const dytallixSummary = {
    what: "Dytallix is a post-quantum digital infrastructure company building the foundation for applications, networks, and institutions that need to stay credible in a world where classical cryptography is approaching its limits. At its core, Dytallix combines a quantum-secure blockchain, developer tooling, AI-powered security intelligence, and enterprise-ready products into one operating platform. Instead of treating quantum readiness as a narrow compliance exercise, Dytallix treats it as a systems design challenge: how do you create a stack that can secure value, identity, data, and governance from the protocol layer all the way to the user experience? The answer is an ecosystem where builders can launch on resilient primitives, enterprises can adopt post-quantum controls without having to re-architect everything at once, and communities can participate in transparent, open-source infrastructure that is designed for long-term durability. Dytallix is not only shipping code; it is defining a practical migration path from fragile legacy assumptions to a security model built for the next era of computing.",
    why: "The reason Dytallix exists is simple: the risk is no longer theoretical, and most organizations are still structured as if it is. Quantum computing changes the security timeline for any system that depends on RSA, ECC, or other classical assumptions with long exposure windows. Harvest-now, decrypt-later strategies mean sensitive information can be stolen today and broken later, long before many teams finish debating their roadmap. At the same time, infrastructure teams are forced to navigate fragmented vendors, incomplete standards, and a gap between research-grade cryptography and production-grade implementation. Dytallix exists to close that gap. It gives developers a place to build with post-quantum assumptions from the start, and it gives enterprises a way to move deliberately instead of reactively. The mission is not to add a marketing layer on top of old systems. The mission is to make quantum resilience operational, measurable, and accessible before the cost of delay becomes unacceptable.",
    how: "Dytallix delivers on that mission through a modular architecture that makes security usable instead of abstract. The platform pairs quantum-resistant cryptography with open tooling, documented APIs, and deployable products that solve immediate business problems while advancing long-term readiness. Its blockchain layer is designed for post-quantum integrity, transparent governance, and extensibility. Its developer environment makes it easier to experiment, ship, and integrate without being forced into a black-box stack. Its AI modules help identify exposure, prioritize action, and surface signal in environments where teams are already overloaded with noise. On top of that foundation, Dytallix introduces products like QuantumVault that turn advanced cryptographic posture into something operational teams can adopt through dashboards, workflows, and policy-driven controls. The result is an ecosystem that connects protocol innovation to enterprise execution. Dytallix is building for builders, operators, and organizations that need trust to survive contact with the future, not just impress people in the present."
}

const quantumVaultSummary = {
    what: "QuantumVault is Dytallix's enterprise security layer for protecting high-value data, digital assets, and operational records against both current compromise and future decryption risk. It is built for organizations that cannot afford to wait until quantum disruption is obvious to the market. QuantumVault combines post-quantum cryptography, secure workflows, auditability, and risk visibility into a product that helps teams understand what they have, why it matters, and how to protect it. Rather than behaving like a static vault or passive archive, QuantumVault is designed as an active security environment. It can support encryption, discovery, policy enforcement, attestation, and proof-oriented lifecycle management for assets that need to remain trustworthy over long horizons. That makes it relevant not only for finance and digital custody, but also for regulated records, legal evidence, intellectual property, critical business documents, and any class of information where the shelf life of confidentiality extends beyond the comfort zone of legacy encryption. QuantumVault is the operational bridge between quantum research and daily security practice.",
    why: "QuantumVault exists because enterprise security teams face a structural problem: the systems they rely on were not designed for a future where today's encrypted archives may become tomorrow's plaintext. Long-lived data is especially exposed. Mergers, legal records, healthcare histories, product designs, customer credentials, infrastructure keys, and chain-of-custody evidence all carry value that lasts longer than most cryptographic refresh cycles. Even when leaders understand the threat, the work of modernizing controls is slowed by complexity, fragmented ownership, and the absence of tools that translate post-quantum strategy into usable operations. QuantumVault addresses that problem directly. It gives teams a product they can evaluate, pilot, and scale without having to become cryptography researchers first. It supports the business case for action by making risk visible and by tying protection measures to governance, compliance, and resilience outcomes. In short, QuantumVault exists to make quantum security a practical operating capability instead of a deferred roadmap slide.",
    how: "QuantumVault works by combining strong cryptographic primitives with enterprise workflows that are designed for accountability and adoption. Sensitive assets can be encrypted with post-quantum protections before storage, transfer, or sharing. Discovery and classification layers help teams identify where exposure exists and which materials deserve priority treatment. Policy and approval controls can govern who can access, attest to, or move protected assets. Integrity proofs, event trails, and anchored records help create defensible evidence for audits, compliance reviews, and incident response. The surrounding interface is just as important as the cryptography: operators need dashboards, clear states, and repeatable actions, not just algorithm names. That is why QuantumVault emphasizes usability, explainability, and integration readiness. It is meant to fit into the real cadence of enterprise operations while improving the security posture underneath them. The product helps organizations move from uncertainty to inventory, from inventory to policy, and from policy to a durable, quantum-ready control plane they can trust."
}

const founderCards = [
    {
        name: "Andrew Holland",
        role: "Founder",
        initials: "AH",
        accent: "from-emerald-500/30 via-cyan-500/20 to-transparent",
    },
    {
        name: "Rick Glenn",
        role: "Founder",
        initials: "RG",
        accent: "from-blue-500/30 via-indigo-500/20 to-transparent",
    },
]

function NarrativeSection({
    icon: Icon,
    badge,
    title,
    subtitle,
    accentClass,
    summary,
}: {
    icon: typeof Building2
    badge: string
    title: string
    subtitle: string
    accentClass: string
    summary: { what: string; why: string; how: string }
}) {
    return (
        <Section className="py-12 md:py-16 first:pt-32 first:md:pt-36">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-10">
                <GlassPanel className="p-6 md:p-8 xl:sticky xl:top-24 h-fit overflow-hidden">
                    <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${accentClass}`} />
                    <div className="relative space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            <Icon className="h-4 w-4" />
                            {badge}
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
                                {title}
                            </h1>
                            <p className="text-sm leading-7 text-muted-foreground md:text-base">
                                {subtitle}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-left">
                            {[
                                { label: "What", value: "Mission" },
                                { label: "Why", value: "Urgency" },
                                { label: "How", value: "Execution" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </GlassPanel>

                <div className="grid gap-5">
                    {[
                        { heading: "What", body: summary.what },
                        { heading: "Why", body: summary.why },
                        { heading: "How", body: summary.how },
                    ].map((item) => (
                        <GlassPanel key={item.heading} variant="card" className="p-6 md:p-8">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                                <div className="md:w-28 shrink-0">
                                    <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                        {item.heading}
                                    </span>
                                </div>
                                <p className="text-base leading-8 text-muted-foreground md:text-[1.02rem]">
                                    {item.body}
                                </p>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            </div>
        </Section>
    )
}

export function About() {
    return (
        <>
            <NarrativeSection
                icon={Building2}
                badge="About Dytallix"
                title="A platform built for the post-quantum era"
                subtitle="Three layers define this story: the network we are building, the security product it enables, and the founders shaping the work."
                accentClass="from-emerald-500/20 via-cyan-500/10 to-transparent"
                summary={dytallixSummary}
            />

            <NarrativeSection
                icon={ShieldCheck}
                badge="About QuantumVault"
                title="Enterprise security that turns quantum readiness into operations"
                subtitle="QuantumVault is where Dytallix becomes immediately actionable for organizations protecting long-lived, high-value information."
                accentClass="from-blue-500/20 via-indigo-500/10 to-transparent"
                summary={quantumVaultSummary}
            />

            <Section className="pt-12 pb-24 md:pt-16 md:pb-28">
                <div className="mb-10 flex flex-col gap-5 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <Users className="h-4 w-4" />
                        The People
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
                        Founders driving the platform forward
                    </h2>
                    <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                        This section is framed for founder bios and portraits. Once you send the copy and images, these placeholders can be replaced with final profiles without changing the page structure.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="grid gap-6 md:grid-cols-2">
                        {founderCards.map((founder) => (
                            <GlassPanel key={founder.name} className="overflow-hidden">
                                <div className={`h-28 bg-gradient-to-br ${founder.accent}`} />
                                <div className="p-6 pt-0">
                                    <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-black/50 text-2xl font-bold shadow-xl shadow-black/20 backdrop-blur-xl">
                                        {founder.initials}
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        <div>
                                            <p className="text-2xl font-bold tracking-tight">{founder.name}</p>
                                            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{founder.role}</p>
                                        </div>

                                        <p className="text-sm leading-7 text-muted-foreground">
                                            Founder bio and headshot placeholder. This card is ready for a final portrait, a short executive biography, and any supporting links or credentials you want surfaced on the public page.
                                        </p>

                                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-sm text-muted-foreground">
                                            Image area reserved for supplied founder photo.
                                        </div>
                                    </div>
                                </div>
                            </GlassPanel>
                        ))}
                    </div>

                    <GlassPanel variant="card" className="p-6 md:p-8 flex flex-col justify-between gap-8">
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Founder Section Framework</p>
                                <h3 className="mt-3 text-2xl font-bold tracking-tight">Ready for portraits, bios, and proof points</h3>
                            </div>

                            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                                <p>
                                    The current structure supports two founder profiles with room for a portrait, a concise biography, a role label, and a supporting credibility block.
                                </p>
                                <p>
                                    If you want, the next revision can also include direct links to LinkedIn, previous ventures, technical credentials, advisory roles, or a short quote from each founder.
                                </p>
                                <p>
                                    This layout is built to stay stable as content changes, so swapping placeholder content for final assets should be a low-risk update.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild>
                                <Link to="/contact">
                                    Contact Dytallix
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="outline" className="glass-button" asChild>
                                <Link to="/enterprise">Explore QuantumVault</Link>
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            </Section>
        </>
    )
}