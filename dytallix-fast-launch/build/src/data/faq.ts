
export interface FAQItem {
    question: string
    answer: string
}

export const faqData: FAQItem[] = [
    {
        question: "Is the current concern around quantum computing and cryptography exaggerated, or is it a real, near-term risk to existing systems?",
        answer: "No. This is not speculative technology or marketing-driven fear. Dytallix does not invent cryptographic primitives or rely on untested theory. The algorithms used are the result of a multi-year, open, adversarial selection process led by NIST and scrutinized by the world's leading cryptographers. Thousands of proposed schemes were attacked; only a small number survived. These same algorithms are already being adopted to secure central banking infrastructure, defense systems, and national security communications. If these algorithms fail, the impact is systemic. Financial systems, government communications, and global infrastructure fail together. In that scenario, Dytallix—or any blockchain—is irrelevant. We are not upstream of this risk. We are downstream of globally accepted cryptographic reality."
    },
    {
        question: "What problem does Dytallix solve that existing blockchains and security upgrades cannot realistically address?",
        answer: "Existing blockchains are built on elliptic-curve cryptography. That cryptography does not survive quantum attack. This is not an edge case; it is the foundation of ownership, authorization, and consensus. Dytallix solves the problem those systems cannot: maintaining transaction integrity and ownership once classical public-key cryptography fails. Retrofitting post-quantum tools onto legacy systems preserves their weakest assumptions. Dytallix removes those assumptions entirely by rebuilding the trust layer using post-quantum primitives from inception."
    },
    {
        question: "Why is retrofitting post-quantum cryptography onto existing chains insufficient or dangerous?",
        answer: "Backward compatibility preserves the attack surface. As long as a system continues to accept legacy keys, addresses, or signatures, it remains vulnerable. A quantum attacker does not need to break the new cryptography; they only need to exploit the weakest legacy path that still controls value. Retrofitting also forces high-risk migrations under pressure: asset wrapping, bridging, or identity rotation. These processes have a documented history of failure. Dytallix avoids this by enforcing a zero-legacy security boundary from the start."
    },
    {
        question: 'How does Dytallix avoid the "theory-only" trap common to deep-tech and cryptography projects?',
        answer: "By restricting itself to standardized, implemented, and benchmarked cryptography, and then engineering around the real costs of using it. The primitives Dytallix relies on are finalized standards with reference implementations and known performance profiles. The protocol explicitly accounts for their bandwidth and computational overhead through execution design and fee mechanics. This is not a whitepaper-only system. It is running code designed for adversarial conditions."
    },
    {
        question: "What concrete assumptions does Dytallix make about quantum attackers, and what happens if those assumptions are wrong?",
        answer: "Dytallix assumes that sufficiently powerful quantum computers will break RSA and elliptic-curve cryptography using Shor's algorithm. This assumption is shared by every major standards body and security agency. It does not assume that lattice- or hash-based problems fall in the same way. If those assumptions change, the protocol supports cryptographic agility at the consensus level. Algorithms can be deprecated or revoked without rewriting history or forcing emergency forks. If all modern cryptography fails simultaneously, no digital system survives. Dytallix does not claim otherwise."
    },
    {
        question: "How do we know the cryptography you rely on won't fail the way RSA and ECC eventually will?",
        answer: "We do not claim permanence. We claim measured resilience. RSA and ECC were adopted without being tested against quantum adversaries. Post-quantum algorithms were selected specifically because no efficient quantum attacks are known despite years of focused effort to find them. The security model is based on current, falsifiable hardness assumptions. Dytallix formalizes how those assumptions can be replaced if evidence changes."
    },
    {
        question: "What are the real performance, cost, and operational tradeoffs of running a post-quantum-native blockchain?",
        answer: "Post-quantum cryptography is heavier. Signatures are larger and verification costs more. Ignoring this reality produces unusable systems. Dytallix addresses this directly through its execution environment, batch verification, and a dimensional fee model that prices compute and bandwidth separately. Security costs are explicit, predictable, and economically enforced rather than hidden or subsidized until failure."
    },
    {
        question: "What prevents Dytallix from becoming obsolete if newer post-quantum algorithms or attacks emerge?",
        answer: "Cryptography is not hard-coded as immutable truth. Dytallix maintains an on-chain algorithm registry with defined lifecycle states. New primitives can be activated, existing ones deprecated, and broken ones revoked through governance. This allows the system to evolve without invalidating ownership history or halting the network. Most systems fail because they cannot change under pressure. Dytallix is designed to."
    },
    {
        question: "Who is this actually built for, and who should not be using Dytallix at all?",
        answer: "Dytallix is built for systems where integrity must survive the quantum transition: long-horizon assets, institutional custody, critical infrastructure, and applications where cryptographic failure is catastrophic. It is not built for short-term speculation, maximal throughput experimentation, or environments where convenience outweighs durability. If quantum risk is irrelevant to your time horizon, Dytallix is unnecessary."
    },
    {
        question: "Why should we choose Dytallix?",
        answer: "Because we optimized for the point where cryptography actually fails. Not for adoption speed, not for legacy compatibility, and not for marketing narratives. Dytallix is not a patch on top of a fragile system. It is a clean construction designed to remain valid when foundational assumptions break. If you require guarantees that survive beyond upgrade cycles and market phases, this is the correct foundation."
    }
]
