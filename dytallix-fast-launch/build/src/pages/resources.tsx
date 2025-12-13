import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Download, Book, Shield, Coins, Megaphone, ArrowRight } from "lucide-react"
import { Button } from "../components/ui/Button"

export function Resources() {
    const whitepapers = [
        {
            title: "Foundational Whitepaper",
            description: "The 'What, Why, How, and When' of Dytallix. Explains the philosophical, operational, and logical basis of the project.",
            icon: Book,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            status: "Available"
        },
        {
            title: "Technical Whitepaper",
            description: "Deep dive into the code, logic, and mathematics behind our post-quantum cryptography and consensus mechanisms.",
            icon: Shield,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            status: "Available"
        },
        {
            title: "Tokenomics Paper",
            description: "Detailed breakdown of the dual-token economy (DGT & DRT), emission schedules, and staking mechanics.",
            icon: Coins,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            status: "Available"
        },
        {
            title: "QuantumVault Marketing",
            description: "Overview of our enterprise security solution, specifically designed for decision-makers and CISOs.",
            icon: Megaphone,
            color: "text-green-500",
            bg: "bg-green-500/10",
            status: "Coming Soon"
        }
    ]

    return (
        <>
            <Section title="Resources" subtitle="Whitepapers, documentation, and technical deep dives into the Dytallix ecosystem.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    {whitepapers.map((paper, i) => (
                        <GlassPanel key={i} hoverEffect={true} className="p-8 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`h-12 w-12 rounded-lg ${paper.bg} flex items-center justify-center ${paper.color}`}>
                                    <paper.icon className="h-6 w-6" />
                                </div>
                                {paper.status === "Coming Soon" && (
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-muted-foreground border border-white/5">
                                        Coming Soon
                                    </span>
                                )}
                            </div>

                            <h3 className="text-2xl font-bold mb-3">{paper.title}</h3>
                            <p className="text-muted-foreground mb-8 flex-grow">
                                {paper.description}
                            </p>

                            <div className="mt-auto pt-6 border-t border-white/10">
                                <Button
                                    className="w-full gap-2"
                                    disabled={paper.status === "Coming Soon"}
                                    variant={paper.status === "Coming Soon" ? "outline" : "default"}
                                >
                                    <Download className="h-4 w-4" />
                                    {paper.status === "Coming Soon" ? "Notify Me" : "Download PDF"}
                                </Button>
                            </div>
                        </GlassPanel>
                    ))}
                </div>

                <GlassPanel hoverEffect={true} className="p-12 text-center relative overflow-visible">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/20 rounded-full blur-3xl"></div>

                    <h2 className="text-3xl font-bold mb-6">Developer Documentation</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Building on Dytallix? Explore our comprehensive documentation for SDKs, API references, and integration guides.
                    </p>

                    <Button size="lg" className="gap-2" asChild>
                        <a href="/docs">
                            View Documentation <ArrowRight className="h-4 w-4" />
                        </a>
                    </Button>
                </GlassPanel>
            </Section>
        </>
    )
}
