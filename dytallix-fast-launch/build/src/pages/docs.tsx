import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Download, MessageSquare, Github, Mail, Terminal, Book, ArrowRight } from "lucide-react"

export function Docs() {
    return (
        <Section title="Documentation" subtitle="Official resources for developers.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
                {/* SDKs */}
                <GlassPanel className="p-8 space-y-6 flex flex-col h-full" hoverEffect={true}>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Download className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold">Rust SDK</h3>
                    </div>
                    <p className="text-muted-foreground flex-grow">
                        Official Rust bindings for building robust applications on Dytallix. Optimized for performance and quantum security.
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <a href="https://github.com/DytallixHQ/Dytallix/tree/main/DytallixRustSDK" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-lg group">
                            <span className="font-medium group-hover:text-amber-400 transition-colors">View on GitHub</span>
                            <Github className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-8 space-y-6 flex flex-col h-full" hoverEffect={true}>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Download className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold">TypeScript SDK</h3>
                    </div>
                    <p className="text-muted-foreground flex-grow">
                        JavaScript/TypeScript client for web dApps and Node.js services. Full support for PQC wallets in browser and server.
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <a href="https://github.com/DytallixHQ/Dytallix/tree/main/DytallixTypescriptSDK" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-lg group">
                            <span className="font-medium group-hover:text-blue-400 transition-colors">View on GitHub</span>
                            <Github className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </GlassPanel>
            </div>

            {/* Network Details & Guides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
                <GlassPanel className="p-8" hoverEffect={true}>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <Terminal className="h-5 w-5 text-purple-400" />
                        Network Details
                    </h3>
                    <div className="space-y-4 font-mono text-sm">
                        <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center group">
                            <span className="text-muted-foreground">RPC URL</span>
                            <span className="text-purple-300 select-all">https://rpc.testnet.dytallix.network</span>
                        </div>
                        <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center group">
                            <span className="text-muted-foreground">Chain ID</span>
                            <span className="text-purple-300 select-all">dyt-testnet-1</span>
                        </div>
                        <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center group">
                            <span className="text-muted-foreground">Currencies</span>
                            <div className="text-right text-sm">
                                <div className="text-purple-300">DGT <span className="text-muted-foreground text-xs">(Governance)</span></div>
                                <div className="text-purple-300">DRT <span className="text-muted-foreground text-xs">(Reward)</span></div>
                            </div>
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-8" hoverEffect={true}>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <Book className="h-5 w-5 text-indigo-400" />
                        Developer Guides
                    </h3>
                    <ul className="space-y-3">
                        <li>
                            <a href="#" className="flex items-center justify-between p-3 rounded hover:bg-white/5 transition-colors group">
                                <span className="text-muted-foreground group-hover:text-indigo-300 transition-colors">Validator Setup Guide</span>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                            </a>
                        </li>
                        <li>
                            <a href="#" className="flex items-center justify-between p-3 rounded hover:bg-white/5 transition-colors group">
                                <span className="text-muted-foreground group-hover:text-indigo-300 transition-colors">Token Standards (QRC-20)</span>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                            </a>
                        </li>
                        <li>
                            <a href="#" className="flex items-center justify-between p-3 rounded hover:bg-white/5 transition-colors group">
                                <span className="text-muted-foreground group-hover:text-indigo-300 transition-colors">Migration from EVM</span>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                            </a>
                        </li>
                        <li>
                            <a href="#" className="flex items-center justify-between p-3 rounded hover:bg-white/5 transition-colors group">
                                <span className="text-muted-foreground group-hover:text-indigo-300 transition-colors">QuantumVault Architecture</span>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                            </a>
                        </li>
                    </ul>
                </GlassPanel>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                <GlassPanel className="p-8" hoverEffect={true}>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-green-400" />
                        Community & Support
                    </h3>
                    <div className="space-y-4">
                        <a href="https://discord.gg/N8Q4A2KE" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 group">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium group-hover:text-indigo-300 transition-colors">Join us on Discord</h4>
                                <p className="text-sm text-muted-foreground">discord.gg/N8Q4A2KE</p>
                            </div>
                        </a>

                        <a href="https://github.com/DytallixHQ/Dytallix/issues/new" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 group">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium group-hover:text-red-300 transition-colors">Report Errors</h4>
                                <p className="text-sm text-muted-foreground">Open issue or email hello@dytallix.com</p>
                            </div>
                        </a>
                    </div>
                </GlassPanel>
            </div>
        </Section>
    )
}
