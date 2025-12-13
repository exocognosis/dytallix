import { Link } from "react-router-dom"
import { Github, Twitter, Send } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-sm mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center gap-2">
                            <img src="/Logo2.png" alt="Dytallix Logo" className="w-6 h-6 rounded" />
                            <span className="font-bold">Dytallix</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Open-source, quantum-secure, and built for the future. NIST-standardized cryptography meets developer-first tooling.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/build" className="hover:text-foreground transition-colors">Developer Hub</Link></li>
                            <li><Link to="/enterprise" className="hover:text-foreground transition-colors">QuantumVault</Link></li>
                            <li><Link to="/tokenomics" className="hover:text-foreground transition-colors">Tokenomics</Link></li>
                            <li><Link to="/roadmap" className="hover:text-foreground transition-colors">Roadmap</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                            <li><Link to="/tech-stack" className="hover:text-foreground transition-colors">Tech Stack</Link></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">Whitepaper</a></li>
                            <li><Link to="/build/blockchain" className="hover:text-foreground transition-colors">Network Explorer</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Connect</h3>
                        <div className="flex gap-4 mb-4">
                            <a href="https://github.com/DytallixHQ/Dytallix/tree/main" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Github className="w-5 h-5" /></a>
                            <a href="https://x.com/DytallixHQ" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter className="w-5 h-5" /></a>
                            <a href="https://t.me/dytallix" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Send className="w-5 h-5" /></a>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
                            <li><Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Dytallix Foundation. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
