import { Section } from "../../components/ui/Section"
import { GlassPanel } from "../../components/ui/GlassPanel"
import { Button } from "../../components/ui/Button"
import { Wallet, Coins, Activity, ArrowRight, Terminal, Rocket, Copy, Check } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"

export function DeveloperHub() {
    const [copiedStep, setCopiedStep] = useState<string | null>(null)

    const handleCopy = (text: string, step: string) => {
        navigator.clipboard.writeText(text)
        setCopiedStep(step)
        setTimeout(() => setCopiedStep(null), 2000)
    }

    return (
        <>
            <Section title="Developer Hub" subtitle="Everything you need to build on Dytallix.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GlassPanel variant="card" className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">PQC Wallet</h3>
                        <p className="text-muted-foreground flex-1">
                            Generate quantum-secure keypairs (Dilithium/Falcon) and manage your testnet assets.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/build/wallet">Open Wallet <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </GlassPanel>

                    <GlassPanel variant="card" className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Coins className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Testnet Faucet</h3>
                        <p className="text-muted-foreground flex-1">
                            Request DGT and DRT tokens to fund your wallet and deploy contracts.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/build/faucet">Get Tokens <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </GlassPanel>

                    <GlassPanel variant="card" className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                            <Activity className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold">Network Status</h3>
                        <p className="text-muted-foreground flex-1">
                            Monitor block production, transaction throughput, and validator health.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/build/blockchain">View Status <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </GlassPanel>
                </div>
            </Section>

            <Section title="Quickstart Guide" subtitle="Get up and running in minutes.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            step: "01",
                            title: "Clone SDKs",
                            desc: "git clone https://github.com/DytallixHQ/Dytallix.git",
                            icon: Terminal,
                            color: "text-blue-500",
                            bg: "bg-blue-500/10"
                        },
                        {
                            step: "02",
                            title: "Create Wallet",
                            desc: "dytx keys add my-key",
                            icon: Wallet,
                            color: "text-purple-500",
                            bg: "bg-purple-500/10"
                        },
                        {
                            step: "03",
                            title: "Deploy Contract",
                            desc: "dytx contract deploy --wasm contract.wasm",
                            icon: Rocket,
                            color: "text-green-500",
                            bg: "bg-green-500/10"
                        },
                    ].map((item, i) => (
                        <GlassPanel key={i} hoverEffect={true} className="p-8 relative overflow-hidden flex flex-col items-center text-center group">
                            <div className="absolute -right-4 -top-4 text-9xl font-bold text-foreground/5 opacity-10 select-none group-hover:opacity-20 transition-opacity">
                                {item.step}
                            </div>
                            <div className={`h-12 w-12 rounded-full ${item.bg} flex items-center justify-center ${item.color} mb-4`}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                            <div className="relative w-full mt-2 group/code">
                                <code className="block bg-black/20 rounded p-3 text-sm font-mono text-muted-foreground overflow-x-auto whitespace-nowrap pr-10">
                                    {item.desc}
                                </code>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
                                    onClick={() => handleCopy(item.desc, item.step)}
                                >
                                    {copiedStep === item.step ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            </Section>

            <Section>
                <GlassPanel hoverEffect={true} className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-bold">Documentation</h3>
                        <p className="text-muted-foreground text-lg max-w-xl">
                            Dive deep into the Dytallix architecture, PQC standards, and smart contract development guides.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button size="lg" asChild>
                            <Link to="/docs">Read Docs</Link>
                        </Button>
                        <Button size="lg" variant="ghost" asChild>
                            <a href="https://github.com/dytallix" target="_blank" rel="noreferrer">GitHub</a>
                        </Button>
                    </div>
                </GlassPanel>
            </Section>
        </>
    )
}
