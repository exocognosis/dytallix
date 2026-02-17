import { Building2, Stethoscope, Briefcase, Cpu, Palette, FlaskConical } from "lucide-react"

export const industryUseCases = [
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
]
