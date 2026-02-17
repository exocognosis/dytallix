
export interface FAQItem {
    question: string
    answer: string
}

export const dytallixFaqData: FAQItem[] = [
    {
        question: "What is Dytallix?",
        answer: "Dytallix is a Layer 1 blockchain engineered for a world where cryptographically relevant quantum computers (CRQCs) exist. This means Dytallix operates as its own base consensus network rather than relying on another chain's security assumptions. Dytallix is post-quantum cryptography (PQC) native: consensus votes, transaction authorization, and network handshakes rely on NIST-standardized PQC primitives rather than classical elliptic-curve cryptography."
    },
    {
        question: "Is Quantum Risk Real?",
        answer: "The quantum threat is not theoretical - it is a long-horizon risk that affects any data whose confidentiality must endure for decades. Adversaries can capture encrypted traffic today and decrypt it later (\"harvest now, decrypt later\"). Any data whose confidentiality must survive beyond the \"Y2Q\" horizon faces increasing long-term exposure if transmitted or stored under classical public-key cryptography."
    },
    {
        question: "What problem does Dytallix solve?",
        answer: "Dytallix is designed to preserve the integrity and authenticity of digital assets in a post-quantum world. In distributed systems, the quantum threat is existential: if an attacker can derive private keys from public keys at scale, they can forge transactions, hijack validator identities, and rewrite economic history. Dytallix is built to remain secure when classical assumptions fail."
    },
    {
        question: "Why not retrofit existing chains?",
        answer: "Many existing blockchain networks plan to address quantum risk through incremental upgrades or layered abstractions. While these approaches may provide partial mitigation, they often require maintaining backward compatibility with classical cryptographic systems. Dytallix adopts a zero-legacy mandate, rejecting classical ECDSA-based accounts to avoid permanent dependencies on compromised primitives."
    },
    {
        question: "Who is Dytallix built for?",
        answer: "Dytallix is built for organizations whose data, identities, or digital assets must remain secure for decades - not years. These are institutions that operate on long time horizons and cannot afford retrospective compromise. It is built for the durability economy of the next century: industries where data longevity exceeds the timeline to quantum viability (the Y2Q horizon). This includes healthcare systems protecting patient records and other medical data, financial institutions safeguarding multi-decade asset positions, government agencies securing critical communications and national security interests, cloud infrastructure providers managing persistent storage, pharmaceuticals preserving intellectual property, and sovereign funds maintaining generational capital integrity."
    },
    {
        question: "What is Dytallix not designed to replace or compete with?",
        answer: "Dytallix focuses on quantum-secure authenticity and transport confidentiality. It prioritizes quantum-secure authenticity and transport confidentiality at the protocol layer. Advanced privacy features beyond this baseline are part of the long-term roadmap rather than the initial design objective. It also explicitly avoids compatibility with legacy elliptic-curve wallets or signing systems."
    },
    {
        question: "What if large-scale quantum computers take longer than expected to materialize?",
        answer: "Even if large-scale quantum computers are delayed, the risk model remains unchanged because encrypted data can be harvested today and decrypted in the future. Because of \"harvest now, decrypt later\" (HNDL) attacks, data transmitted today is already effectively compromised if its secrecy must last 30+ years. Dytallix addresses this present-day exposure by ensuring assets are \"born secure\"."
    },
    {
        question: "What cryptographic standards does Dytallix use?",
        answer: "Dytallix relies exclusively on NIST-standardized post-quantum cryptographic algorithms as its default security primitives. It standardizes NIST PQC algorithms as defaults: ML-DSA-65 (FIPS 204) for account authorization and validator voting, ML-KEM-768 (FIPS 203) for node handshakes, and SLH-DSA-SHAKE-192s (FIPS 205) as an optional cold-storage signature system. It also uses BLAKE3 for state trie construction and SHAKE256 (FIPS 202) for the final block hash."
    },
    {
        question: "What assumptions does Dytallix make?",
        answer: "Like all cryptographic systems, Dytallix relies on well-studied mathematics hardness assumptions. The protocol assumes the hardness of Module-LWE (Learning With Errors) for ML-KEM and Module-SIS (Short Integer Solution) for ML-DSA. It also assumes an honest supermajority (fewer than 1/3 of total staked DGT controlled by adversaries) is required for BFT finality."
    },
    {
        question: "How does Dytallix handle cryptographic agility?",
        answer: "Dytallix treats cryptography as an evolving discipline, not a fixed constant. PQC is not treated as \"final\". Dytallix maintains an algorithm lifecycle model (e.g., Experimental -> Active -> Deprecated -> Revoked) and defines governance-controlled transitions, including emergency deprecation under demonstrated breaks."
    },
    {
        question: "What are the performance and operational tradeoffs of running a post-quantum-native infrastructure layer?",
        answer: "PQC verification is computationally heavier than ECC, and lattice signatures are much larger (kilobyte-class). Dytallix manages this via a dimensional fee market that prices compute and bandwidth separately. The network is optimized for modern hardware acceleration and efficient verification to balance security with operational performance (achieved through hardware optimizations like AVX-512 and SIMD for matrix operations)."
    },
    {
        question: "How is Dytallix governed?",
        answer: "Governance in Dytallix is designed to separate long-term protocol stewardship from day-to-day network utility. Dytallix uses a dual-token architecture where DGT (Dytallix Governance Token) is the fixed-supply asset used for DAO voting and staking delegation. DRT (Dytallix Reward Token) is a consumable utility resource (gas) and operational reward with no governance power."
    },
    {
        question: "Is Dytallix a public network, a permissioned system, or can it be deployed privately?",
        answer: "Dytallix operates as a permissionless base network to preserve neutrality and censorship resistance. It is a permissionless Layer 1 blockchain. However, it offers institutional integration surfaces like QuantumVault, which provides custody and control planes for enterprise workflows without changing the permissionless consensus boundary."
    },
    {
        question: "How does Dytallix integrate with existing enterprise systems?",
        answer: "Dytallix is designed to integrate with existing enterprise workflows without requiring wholesale system replacement. With its flagship product, QuantumVault, it provides for institutional custody and \"Airlock Migration,\" allowing organizations to migrate value into a PQC-native environment. It also supports verifiable credentials and permissioned pools at the application layer to meet regulatory needs."
    },
    {
        question: "What is the long-term roadmap for Dytallix?",
        answer: "Dytallix follows a phased, transparency-driven roadmap toward mainnet launch and long-term quantum resilience. The roadmap progresses through Phase 1 (Devnet stability, Q1-Q3 2026), Phase 2 (Public validator onboarding and Testnet \"Alkali\", Q4 2026-Q1 2027), and Phase 3 (Genesis and Mainnet launch, Q2-Q4 2027). Future phases include scaling via L2 rollups (2028-2029) and long-horizon hardening for the \"Y2Q\" transition (2030+)."
    },
    {
        question: "Has Dytallix undergone independent security or cryptographic audits?",
        answer: "Dytallix is committed to third-party security and cryptographic audits prior to mainnet launch. Independent review is a foundational requirement for long-term protocol credibility, and audit reports will be made publicly available where appropriate."
    }
]

export const quantumVaultFaqData: FAQItem[] = [
    {
        question: "What is QuantumVault and how is it different from Dytallix?",
        answer: "QuantumVault is a post-quantum-hardened data protection and cryptographic transition platform designed to help enterprises move from classical cryptography to NIST-standardized post-quantum security without disrupting existing systems. Unlike Dytallix, which is a Layer 1 blockchain protocol, QuantumVault operates as a client-resident cryptographic control plane deployed within an organization's own infrastructure. It strengthens existing trust anchors and key management systems rather than replacing business logic or requiring a new network."
    },
    {
        question: "What problem does QuantumVault solve for organizations today?",
        answer: "QuantumVault protects sensitive data against present-day \"Harvest Now, Decrypt Later\" (HNDL) collection and future cryptographically relevant quantum computer (CRQC) threats. It replaces vulnerable classical trust anchors - such as RSA and ECC - with NIST-standardized post-quantum cryptographic primitives, reducing long-term exposure while maintaining operational continuity."
    },
    {
        question: "Who is QuantumVault designed for and when should implementation be considered?",
        answer: "QuantumVault is designed for CTOs, CIOs, and CISOs responsible for protecting long-lived data in regulated or high-sensitivity environments, including Financial Services, Healthcare, Government, Critical Infrastructure, and cloud infrastructure providers. Implementation should be evaluated wherever data confidentiality must endure beyond the projected Y2Q horizon (≈2030–2035), particularly where data retention periods exceed 10–20 years."
    },
    {
        question: "How does data migration work and can it secure existing legacy data?",
        answer: "QuantumVault secures existing data at rest by using block- and object-level encryption, where symmetric keys are protected through post-quantum key encapsulation mechanisms (KEMs). This allows organizations to replace vulnerable asymmetric cryptography without emergency cutovers, system rewrites, or disruption to existing business workflows."
    },
    {
        question: "What is the 90-day (3-month) implementation process?",
        answer: "QuantumVault follows a phased 90-day deployment model designed to minimize risk and operational disruption: Month 1 (Days 1–30) - Exposure Assessment: Crypto-agility audit, sensitive data inventory, and risk prioritization. Month 2 (Days 31–60) - Client-Side Deployment: SDK integration, post-quantum key exchange upgrades, and pilot validation. Month 3 (Days 61–90) - Production Integration: Gateway configuration, traffic cutover, performance optimization, and security hardening."
    },
    {
        question: "Who controls the encryption keys and can third parties access the data?",
        answer: "QuantumVault operates under a \"client-controlled custody\" model. It is deployed entirely within the client's environment. There is no external SaaS dependency and no off-premises custody of keys or data; Dytallix or other third parties cannot access the data."
    },
    {
        question: "How is data integrity verified and protected against HNDL?",
        answer: "All data-in-transit and key exchange paths use NIST-standardized post-quantum key encapsulation mechanisms (KEMs, like Kyber), protecting them against HNDL collection. Integrity and authentication rely on post-quantum digital signatures, ensuring that credentials, updates, and system communications remain unforgeable even under quantum attack models."
    },
    {
        question: "What happens if an algorithm is deprecated or a compromise occurs?",
        answer: "QuantumVault includes trust-anchor agility, allowing cryptographic primitives to be rotated as standards evolve. In the event of a demonstrated weakness, the system supports controlled algorithm deprecation and rapid revocation procedures to neutralize exposure."
    },
    {
        question: "Is QuantumVault compliant with major regulatory frameworks?",
        answer: "Yes. QuantumVault aligns with NIST FIPS 203, 204, and 205 standards for post-quantum cryptography. While regulatory compliance ultimately depends on broader organizational controls, embedding post-quantum security at the cryptographic layer strengthens long-term confidentiality and integrity requirements under frameworks such as GDPR, HIPAA, and PCI-DSS."
    },
    {
        question: "How is QuantumVault priced?",
        answer: "QuantumVault pricing is structured based on deployment scope, integration complexity, and operational footprint. Tiered options are available for pilot environments, enterprise rollouts, and multi-region deployments. For detailed pricing information, please visit dytallix.com/quantumvaultpricing or contact our team directly."
    },
    {
        question: "What happens if we terminate our QuantumVault deployment?",
        answer: "QuantumVault operates under a client-controlled custody model. All encryption keys, encrypted data, and cryptographic configurations remain within the client’s environment at all times. If an organization chooses to terminate its QuantumVault deployment, encrypted data remains fully accessible to the client using retained key material. There is no external SaaS custody layer, no off-premises key escrow, and no dependency on Dytallix-operated infrastructure for data access. Upon termination, organizations may continue operating with the existing post-quantum key material independently, rotate to alternative cryptographic systems, or revert to classical systems (if desired, though not recommended for long-horizon confidentiality). QuantumVault does not impose cryptographic lock-in. Exit procedures are documented and controlled, ensuring operational continuity and preserving data integrity throughout the transition. Assistance during transition or key rotation can be provided under standard support agreements."
    }
]

export const faqData: FAQItem[] = dytallixFaqData
