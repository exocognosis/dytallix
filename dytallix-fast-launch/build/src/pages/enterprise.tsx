import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Button } from "../components/ui/Button"
import { Shield, Lock, ArrowRight, Building2, Stethoscope, Briefcase, Cpu, Palette, FlaskConical, FileText, Landmark } from "lucide-react"
import { Link } from "react-router-dom"
import { QuantumVaultDemo } from "../components/QuantumVaultDemo"

export function EnterpriseHub() {
    return (
        <>
            {/* Hero */}
            <Section className="pt-32 pb-20">
                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-sm font-medium text-blue-500 backdrop-blur-sm">
                        QuantumVault Enterprise
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                        Future-Proof Your Data Security
                    </h1>

                    <p className="max-w-[800px] text-muted-foreground md:text-xl">
                        Protect your organization's sensitive assets from "Harvest Now, Decrypt Later" attacks with Dytallix's QuantumVault technology.
                    </p>

                    <div className="flex gap-4">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20" asChild>
                            <Link to="/contact">Schedule Demo</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="glass-button" asChild>
                            <Link to="/resources">Read Whitepapers</Link>
                        </Button>
                    </div>
                </div>
            </Section>

            {/* The Problem: HNDL */}
            <Section title="The Silent Threat" subtitle="Why you need to act now.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <GlassPanel hoverEffect={true} className="p-8 aspect-square flex flex-col justify-center space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Harvest Now, Decrypt Later (HNDL)</h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Adversaries are actively collecting encrypted data today, storing it until sufficiently powerful quantum computers become available to break current encryption standards like RSA and ECC.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-blue-400">At Risk Data Types</h4>
                            <ul className="grid grid-cols-1 gap-3">
                                {[
                                    "Financial Records & Transaction History",
                                    "Intellectual Property & Trade Secrets",
                                    "Healthcare & Genomic Data",
                                    "Government & Defense Communications",
                                    "Long-term Identity & Authentication Keys"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                            <Lock className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm md:text-base">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>


                    </GlassPanel>
                    <GlassPanel variant="dark" hoverEffect={true} className="p-0 aspect-square flex items-center justify-center relative overflow-hidden">
                        <video
                            controls
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                            preload="metadata"
                        >
                            <source src="/QuantumVaultIntro.mp4" type="video/mp4" />
                            {/* Fallback for browsers that don't support video */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                                <div className="relative z-10 text-center space-y-4 flex flex-col items-center justify-center h-full">
                                    <Shield className="h-24 w-24 mx-auto text-blue-500 opacity-80" />
                                    <p className="font-mono text-sm text-blue-300">Encryption: AES-256-GCM</p>
                                    <p className="font-mono text-sm text-green-400">Status: QUANTUM SECURE</p>
                                </div>
                            </div>
                        </video>
                    </GlassPanel>
                </div>
            </Section>

            {/* QuantumVault Demo */}
            <Section title="Experience QuantumVault" subtitle="Secure your digital assets with real NIST-standardized PQC encryption directly in your browser.">
                <QuantumVaultDemo />
            </Section>

            {/* Solutions Grid */}
            <Section title="Industry Use Cases" subtitle="Tailored QuantumVault solutions for high-stakes sectors.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        {
                            icon: Building2,
                            color: "text-amber-500",
                            title: "Government & Defense",
                            cases: [
                                "Classified Document Storage: Secure intelligence reports and sensitive communications.",
                                "Digital Evidence Chain: Immutable proof of evidence integrity for legal proceedings.",
                                "Treaty & Policy Archives: Long-term preservation of critical agreements.",
                                "Secure Communications: Diplomatic cables protected against quantum decryption."
                            ]
                        },
                        {
                            icon: Stethoscope,
                            color: "text-emerald-500",
                            title: "Healthcare & Life Sciences",
                            cases: [
                                "Patient Records (PHI): HIPAA-compliant storage of medical histories and genomic data.",
                                "Clinical Trial Data: Tamper-proof research data with verifiable integrity.",
                                "Medical Imaging: Secure storage of MRI, CT, and X-ray images.",
                                "Drug Development: Protect proprietary research and formulations."
                            ]
                        },
                        {
                            icon: Briefcase,
                            color: "text-blue-500",
                            title: "Financial Services",
                            cases: [
                                "Transaction Records: Immutable audit trails for regulatory compliance.",
                                "Customer Data (KYC/AML): Secure storage of identity verification documents.",
                                "Trading Algorithms: Protect proprietary quantitative models and strategies.",
                                "Risk Assessment Models: Secure AI models used for credit scoring."
                            ]
                        },
                        {
                            icon: Cpu,
                            color: "text-indigo-500",
                            title: "Technology & Software",
                            cases: [
                                "Source Code Protection: Secure proprietary algorithms and IP.",
                                "Software Releases: Cryptographic proof of software integrity and authenticity.",
                                "API Keys & Secrets: Quantum-safe storage of sensitive credentials.",
                                "User Data: Privacy-preserving storage of customer information."
                            ]
                        },
                        {
                            icon: Palette,
                            color: "text-pink-500",
                            title: "Design & Creative Industries",
                            cases: [
                                "Digital Art & NFTs: Provable ownership and authenticity of digital works.",
                                "Design Files: Protect CAD models and architectural blueprints.",
                                "Media Assets: Secure storage of high-value video and audio content.",
                                "Brand Assets: Immutable proof of trademark and logo ownership."
                            ]
                        },
                        {
                            icon: FlaskConical,
                            color: "text-cyan-500",
                            title: "Pharmaceutical & Research",
                            cases: [
                                "Drug Formulations: Protect billion-dollar research investments.",
                                "Laboratory Data: Secure experimental results and peer review materials.",
                                "Patent Documentation: Immutable proof of invention dates and prior art.",
                                "Regulatory Submissions: Tamper-proof data packages for FDA/EMA."
                            ]
                        }
                    ].map((vertical, i) => (
                        <GlassPanel key={i} variant="card" hoverEffect={true} className="p-8 space-y-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className={`p-3 rounded-lg bg-white/5 ${vertical.color}`}>
                                    <vertical.icon className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">{vertical.title}</h3>
                            </div>
                            <ul className="space-y-3">
                                {vertical.cases.map((useCase, j) => {
                                    const [title, desc] = useCase.split(": ");
                                    return (
                                        <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                                            <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${vertical.color.replace('text-', 'bg-')}`} />
                                            <span>
                                                <strong className="text-foreground">{title}:</strong> {desc}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </GlassPanel>
                    ))}
                </div>
            </Section>

            {/* How QuantumVault Works */}
            <Section title="How QuantumVault Works" subtitle="Defense-grade security architecture built for the post-quantum world.">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Security Architecture */}
                    <GlassPanel variant="card" className="p-8 space-y-6 lg:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="h-6 w-6 text-blue-500" />
                            <h3 className="text-xl font-bold">Security Architecture</h3>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-blue-400 mb-2">Client-Side Encryption</h4>
                                <p className="text-sm text-muted-foreground">
                                    All encryption happens in your browser using WebAssembly-compiled post-quantum algorithms. Your keys never leave your device.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-purple-400 mb-2">Zero-Knowledge Storage</h4>
                                <p className="text-sm text-muted-foreground">
                                    Only encrypted ciphertext is stored. Even if servers are compromised, your data remains protected.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-green-400 mb-2">Quantum Resistance</h4>
                                <p className="text-sm text-muted-foreground">
                                    NIST-standardized algorithms protect against both classical and quantum computer attacks.
                                </p>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Cryptographic Primitives */}
                    <GlassPanel variant="card" className="p-8 space-y-6 lg:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <Cpu className="h-6 w-6 text-amber-500" />
                            <h3 className="text-xl font-bold">Cryptographic Primitives</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Hashing</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>• <strong className="text-white">BLAKE3:</strong> Cryptographic hash function</li>
                                        <li>• <strong className="text-white">Merkle Trees:</strong> Efficient integrity proofs</li>
                                        <li>• <strong className="text-white">Content Addressing:</strong> Deduplication support</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-green-400 mb-2">Symmetric Encryption</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>• <strong className="text-white">XChaCha20-Poly1305:</strong> Authenticated encryption</li>
                                        <li>• <strong className="text-white">Key Derivation:</strong> PBKDF2 / Argon2</li>
                                        <li>• <strong className="text-white">Random Nonces:</strong> WebCrypto secure random</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-purple-400 mb-2">Post-Quantum Signatures</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>• <strong className="text-white">ML-DSA (Dilithium):</strong> Lattice-based signatures</li>
                                        <li>• <strong className="text-white">SLH-DSA (SPHINCS+):</strong> Hash-based signatures</li>
                                        <li>• <strong className="text-white">Falcon:</strong> NTRU lattice signatures</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-amber-500 mb-2">Blockchain Integration</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>• <strong className="text-white">Smart Contracts:</strong> Immutable proof registry</li>
                                        <li>• <strong className="text-white">Merkle Anchoring:</strong> Efficient batch verification</li>
                                        <li>• <strong className="text-white">Timestamping:</strong> Cryptographic proof of existence</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            </Section>

            {/* Security & Compliance */}
            <Section title="Security & Compliance" subtitle="Meeting the highest standards for data protection and regulatory compliance.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassPanel variant="card" className="p-8 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-6 w-6 text-blue-500" />
                            <h3 className="text-lg font-bold">NIST Compliance</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" /> FIPS 140-2 validated algorithms</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" /> NIST SP 800-208 post-quantum standards</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" /> Common Criteria EAL4+ security</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" /> Federal quantum-readiness guidelines</li>
                        </ul>
                    </GlassPanel>

                    <GlassPanel variant="card" className="p-8 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Landmark className="h-6 w-6 text-green-500" />
                            <h3 className="text-lg font-bold">Regulatory Standards</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> HIPAA compliant (Healthcare)</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> GDPR compliant (EU Privacy)</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> SOX compliant (Financial)</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> FedRAMP authorized (Government)</li>
                        </ul>
                    </GlassPanel>

                    <GlassPanel variant="card" className="p-8 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Lock className="h-6 w-6 text-amber-500" />
                            <h3 className="text-lg font-bold">Enterprise Security</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Zero-trust architecture</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> End-to-end encryption</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Multi-signature workflows</li>
                            <li className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Audit trail immutability</li>
                        </ul>
                    </GlassPanel>
                </div>
            </Section>

            {/* CTA */}
            <Section>
                <GlassPanel hoverEffect={true} className="p-12 text-center space-y-6 bg-gradient-to-b from-blue-900/20 to-transparent border-blue-500/20">
                    <h2 className="text-3xl font-bold">Ready to secure your future?</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Join leading organizations piloting QuantumVault today.
                    </p>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
                        <Link to="/contact">Contact Sales <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </GlassPanel>
            </Section>
        </>
    )
}
