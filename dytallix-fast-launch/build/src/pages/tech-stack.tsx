import { useState } from "react"
import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import {
    Shield, Cpu, Network, Code, Database, Wrench,
    CheckCircle, Clock, FlaskConical,
    Layers, ChevronLeft, ChevronRight
} from "lucide-react"

/* ─── Types ──────────────────────────────────────────────────── */

interface Spec {
    label: string
    value: string
}

interface Tech {
    name: string
    desc: string
    details: string
    specs: Spec[]
    status: "production" | "beta" | "planned"
}

interface StackCategory {
    category: string
    blurb: string
    icon: React.ElementType
    color: string
    bg: string
    border: string
    techs: Tech[]
}

/* ─── Data ───────────────────────────────────────────────────── */

const stack: StackCategory[] = [
    {
        category: "Cryptography",
        blurb: "Dytallix's cryptographic layer is purpose-built to withstand both classical and quantum attacks. Every transaction, key exchange, and signature on the network uses NIST-standardized post-quantum algorithms.",
        icon: Shield,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        techs: [
            {
                name: "Dilithium-5",
                desc: "Primary digital signature scheme (NIST Level 5)",
                details: "ML-DSA (Dilithium) is the NIST-selected lattice-based digital signature algorithm. Dytallix uses Level 5 — the highest security tier — for all validator signatures, transaction authorization, and governance votes. It provides a 256-bit quantum security margin, ensuring long-term resistance even as quantum hardware scales.",
                specs: [
                    { label: "NIST Level", value: "5 (highest)" },
                    { label: "Public Key", value: "2,592 bytes" },
                    { label: "Signature Size", value: "4,595 bytes" },
                    { label: "Lattice Type", value: "Module-LWE / Module-SIS" },
                    { label: "Standard", value: "FIPS 204 (ML-DSA)" }
                ],
                status: "production"
            },
            {
                name: "Falcon-1024",
                desc: "Fast signature verification for high-throughput consensus",
                details: "Falcon is used alongside Dilithium for scenarios where compact signatures and fast verification are critical, such as block proposal attestations and inter-validator messaging. Its NTRU-lattice foundation yields signatures ~5× smaller than Dilithium, reducing block overhead during peak load.",
                specs: [
                    { label: "NIST Level", value: "5" },
                    { label: "Public Key", value: "1,793 bytes" },
                    { label: "Signature Size", value: "~1,280 bytes" },
                    { label: "Lattice Type", value: "NTRU" },
                    { label: "Verification Speed", value: "~0.1 ms" }
                ],
                status: "production"
            },
            {
                name: "Kyber-1024",
                desc: "Key encapsulation for secure channels",
                details: "ML-KEM (Kyber) establishes shared secrets for encrypted peer-to-peer channels between nodes, wallets, and RPC endpoints. Every handshake on the Dytallix network uses Kyber-1024 to negotiate ephemeral session keys, guaranteeing forward secrecy against quantum harvest-now-decrypt-later (HNDL) attacks.",
                specs: [
                    { label: "NIST Level", value: "5" },
                    { label: "Public Key", value: "1,568 bytes" },
                    { label: "Ciphertext Size", value: "1,568 bytes" },
                    { label: "Shared Secret", value: "32 bytes" },
                    { label: "Standard", value: "FIPS 203 (ML-KEM)" }
                ],
                status: "production"
            }
        ]
    },
    {
        category: "Consensus & Networking",
        blurb: "The consensus layer marries Byzantine-fault-tolerant finality with a modern peer-to-peer networking stack, delivering sub-second block confirmation while tolerating up to ⅓ malicious validators.",
        icon: Network,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        techs: [
            {
                name: "CometBFT",
                desc: "Tendermint-based BFT consensus engine",
                details: "CometBFT (the successor to Tendermint Core) provides instant finality — once a block is committed, it cannot be reverted. Dytallix extends CometBFT's ABCI++ interface with PQC-signed vote extensions, enabling quantum-safe validator attestations at the consensus level itself.",
                specs: [
                    { label: "Finality", value: "Instant (1 block)" },
                    { label: "Fault Tolerance", value: "⅓ byzantine" },
                    { label: "Block Time", value: "~3 seconds" },
                    { label: "Interface", value: "ABCI++" },
                    { label: "Validator Set", value: "Dynamic, bonded" }
                ],
                status: "production"
            },
            {
                name: "libp2p",
                desc: "Peer-to-peer networking stack",
                details: "libp2p handles all node discovery, peer management, and data propagation across the Dytallix network. It supports multiple transport protocols (TCP, QUIC, WebSocket), NAT traversal, and content-addressed messaging. Dytallix wraps libp2p connections with Kyber-1024 key exchanges for quantum-safe transport.",
                specs: [
                    { label: "Transports", value: "TCP, QUIC, WS" },
                    { label: "Discovery", value: "mDNS, Kademlia DHT" },
                    { label: "Pubsub", value: "GossipSub v1.1" },
                    { label: "NAT Traversal", value: "Relay + Hole Punching" },
                    { label: "Encryption", value: "Kyber-wrapped Noise" }
                ],
                status: "production"
            },
            {
                name: "gRPC / JSON-RPC",
                desc: "High-performance API interfaces",
                details: "External clients interact with Dytallix through dual API interfaces: gRPC (with Protobuf serialization) for high-performance backend integrations and JSON-RPC for browser wallets and developer tooling. Both endpoints support optional PQC-TLS for quantum-safe client-node communication.",
                specs: [
                    { label: "gRPC Protocol", value: "HTTP/2 + Protobuf" },
                    { label: "JSON-RPC", value: "HTTP + WebSocket" },
                    { label: "Throughput", value: "~10k req/s per node" },
                    { label: "Auth", value: "JWT + mTLS (optional PQC)" },
                    { label: "Streaming", value: "Bidirectional (gRPC)" }
                ],
                status: "production"
            }
        ]
    },
    {
        category: "Smart Contracts",
        blurb: "Dytallix's smart contract platform leverages WebAssembly for near-native execution speed with deterministic sandboxing, allowing developers to write contracts in Rust with zero-cost abstractions.",
        icon: Code,
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        techs: [
            {
                name: "WebAssembly (WASM)",
                desc: "Portable, secure execution environment",
                details: "WASM provides a sandboxed, deterministic execution environment for smart contracts. Unlike EVM bytecode, WASM is a compilation target for multiple languages (Rust, C, AssemblyScript) and benefits from decades of compiler optimization. Dytallix uses gas-metered WASM execution with memory limits to prevent resource exhaustion.",
                specs: [
                    { label: "Execution", value: "Interpreted + JIT" },
                    { label: "Memory Model", value: "Linear, bounded" },
                    { label: "Gas Metering", value: "Per-instruction" },
                    { label: "Max Contract Size", value: "512 KB" },
                    { label: "Determinism", value: "Guaranteed" }
                ],
                status: "production"
            },
            {
                name: "Rust",
                desc: "Memory-safe contract language",
                details: "Rust is the primary language for Dytallix smart contracts. Its ownership model eliminates entire classes of vulnerabilities (buffer overflows, use-after-free, data races) at compile time. The Dytallix SDK provides macros and traits that abstract low-level WASM details, letting developers focus on business logic.",
                specs: [
                    { label: "Compiler", value: "rustc → wasm32-wasi" },
                    { label: "Safety", value: "Memory-safe by default" },
                    { label: "SDK", value: "dytallix-sdk (Rust crate)" },
                    { label: "Testing", value: "Native unit + on-chain" },
                    { label: "Audit Support", value: "cargo-audit, clippy" }
                ],
                status: "production"
            },
            {
                name: "Wasmi",
                desc: "Deterministic WASM interpreter",
                details: "Wasmi is the WebAssembly interpreter used for on-chain execution. Unlike JIT-compiled runtimes, Wasmi guarantees bit-identical results across all hardware architectures and operating systems — a hard requirement for blockchain consensus. It includes built-in gas metering and call-depth limiting.",
                specs: [
                    { label: "Mode", value: "Pure interpretation" },
                    { label: "Determinism", value: "Cross-platform identical" },
                    { label: "Gas Model", value: "Instruction-level" },
                    { label: "Call Depth", value: "256 frames max" },
                    { label: "Standards", value: "WASM MVP + ext." }
                ],
                status: "production"
            }
        ]
    },
    {
        category: "AI Integration",
        blurb: "On-chain intelligence meets off-chain compute. Dytallix's AI layer enables machine-learning models to feed risk scores, anomaly flags, and predictive signals into smart contracts through cryptographically-attested oracle bridges.",
        icon: Cpu,
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        techs: [
            {
                name: "Python Microservices",
                desc: "Off-chain risk analysis engines",
                details: "Aegis and other risk-analysis engines run as containerized Python microservices that consume transaction streams from the chain. They perform feature extraction, clustering, and ML inference in near-real-time, publishing scored results back to the chain via oracle adapters. Each service is stateless and horizontally scalable.",
                specs: [
                    { label: "Runtime", value: "Python 3.12 + uvicorn" },
                    { label: "Framework", value: "FastAPI" },
                    { label: "Containerization", value: "Docker / K8s" },
                    { label: "Latency", value: "<200 ms per inference" },
                    { label: "Scaling", value: "Horizontal (stateless)" }
                ],
                status: "production"
            },
            {
                name: "TensorFlow / PyTorch",
                desc: "ML model inference",
                details: "Transaction risk scoring, anomaly detection, and behavioral pattern analysis are powered by deep learning models trained and served using TensorFlow and PyTorch. Models are versioned, A/B tested, and deployed via ONNX Runtime for optimized inference across CPU and GPU backends.",
                specs: [
                    { label: "Training", value: "PyTorch + Lightning" },
                    { label: "Serving", value: "ONNX Runtime" },
                    { label: "Model Types", value: "GNN, Transformer, XGB" },
                    { label: "Versioning", value: "MLflow registry" },
                    { label: "Hardware", value: "CPU / CUDA GPU" }
                ],
                status: "production"
            },
            {
                name: "Oracle Adapters",
                desc: "Secure on-chain data bridging",
                details: "Oracle adapters bridge off-chain ML results to on-chain smart contracts. Each result is Dilithium-signed by the oracle operator, and contracts can verify the signature before acting on the data. This provides a trust-minimized path for AI-generated insights to influence on-chain logic (e.g., freezing suspicious wallets).",
                specs: [
                    { label: "Signature", value: "Dilithium-5 attested" },
                    { label: "Delivery", value: "Push + pull models" },
                    { label: "Freshness", value: "Configurable TTL" },
                    { label: "Dispute", value: "On-chain challenge window" },
                    { label: "Data Format", value: "CBOR-encoded payloads" }
                ],
                status: "beta"
            }
        ]
    },
    {
        category: "Storage & Data",
        blurb: "Dytallix's storage layer combines high-performance embedded databases for state persistence with content-addressed storage for large payloads, all anchored by cryptographic Merkle proofs.",
        icon: Database,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        techs: [
            {
                name: "RocksDB",
                desc: "High-performance embedded key-value store",
                details: "RocksDB serves as the primary state database for Dytallix validators. It stores the IAVL-based Merkle tree that represents the canonical chain state, including account balances, contract storage, and governance parameters. LSM-tree architecture provides excellent write throughput for block commit operations.",
                specs: [
                    { label: "Engine", value: "LSM-tree (log-structured)" },
                    { label: "Write Speed", value: "~800k ops/s" },
                    { label: "Compression", value: "LZ4 / Zstd per level" },
                    { label: "Bloom Filters", value: "Per SST file" },
                    { label: "Snapshots", value: "Instant (zero-copy)" }
                ],
                status: "production"
            },
            {
                name: "IPFS / Content Addressing",
                desc: "Decentralized large-object storage",
                details: "Large payloads — encrypted documents, media, and audit artifacts — are stored on IPFS and referenced on-chain by their content identifier (CID). This keeps the blockchain lean while enabling verifiable retrieval: anyone who fetches the data can recompute the CID and confirm integrity without trusting the provider.",
                specs: [
                    { label: "Addressing", value: "CIDv1 (SHA-256 / Blake3)" },
                    { label: "Pinning", value: "Cluster-managed pins" },
                    { label: "Gateway", value: "HTTP + Bitswap" },
                    { label: "Max Object", value: "1 GB (chunked)" },
                    { label: "Replication", value: "3× minimum" }
                ],
                status: "beta"
            },
            {
                name: "IAVL+ Merkle Tree",
                desc: "Cryptographic state commitment",
                details: "The IAVL+ tree provides an authenticated, versioned data structure for the entire chain state. Every block commit produces a Merkle root that validators attest to during consensus. Light clients can verify any individual state entry (balance, contract variable) by requesting a compact Merkle proof without downloading the full state.",
                specs: [
                    { label: "Structure", value: "Immutable AVL tree" },
                    { label: "Hash Function", value: "SHA-256" },
                    { label: "Proof Size", value: "O(log n)" },
                    { label: "Versioning", value: "Per-block snapshots" },
                    { label: "Pruning", value: "Configurable retention" }
                ],
                status: "production"
            }
        ]
    },
    {
        category: "Developer Tooling",
        blurb: "A complete developer experience from contract scaffolding to on-chain deployment, with a CLI, SDK, and browser-based tools designed to minimize friction for builders targeting the Dytallix network.",
        icon: Wrench,
        color: "text-pink-400",
        bg: "bg-pink-500/10",
        border: "border-pink-500/20",
        techs: [
            {
                name: "Dytallix CLI",
                desc: "Command-line interface for chain interaction",
                details: "The Dytallix CLI (dytx) is the primary tool for developers and validators. It handles key generation (PQC keypairs), transaction signing, contract deployment, chain queries, and node management. Built in Rust, it produces a single static binary with no runtime dependencies.",
                specs: [
                    { label: "Language", value: "Rust (static binary)" },
                    { label: "Key Types", value: "Dilithium-5, Falcon" },
                    { label: "Tx Signing", value: "Offline capable" },
                    { label: "Output", value: "JSON, Table, YAML" },
                    { label: "Plugins", value: "WASM-based extensions" }
                ],
                status: "production"
            },
            {
                name: "Rust SDK (dytallix-sdk)",
                desc: "Smart contract development framework",
                details: "The dytallix-sdk Rust crate provides macros, traits, and runtime bindings for building WASM smart contracts. It includes storage abstractions, cross-contract calling, event emission, and PQC signature verification helpers. Developers can test contracts natively before deploying to a local devnet.",
                specs: [
                    { label: "Crate", value: "dytallix-sdk" },
                    { label: "Entry Macro", value: "#[dytallix::contract]" },
                    { label: "Storage", value: "TypedMap, TypedVec" },
                    { label: "Testing", value: "MockRuntime (native)" },
                    { label: "Docs", value: "docs.dytallix.com" }
                ],
                status: "production"
            },
            {
                name: "Block Explorer & Faucet",
                desc: "Browser-based chain inspection and testnet tokens",
                details: "The Dytallix Explorer provides real-time visibility into blocks, transactions, validators, and contract state. The integrated Faucet lets developers request testnet tokens with a single click. Both tools are React-based SPAs that communicate with nodes via JSON-RPC and WebSocket subscriptions.",
                specs: [
                    { label: "Explorer", value: "React + Vite SPA" },
                    { label: "Data Source", value: "JSON-RPC + WS" },
                    { label: "Faucet", value: "Rate-limited, captcha" },
                    { label: "Search", value: "Tx, Block, Address" },
                    { label: "Live Updates", value: "WebSocket push" }
                ],
                status: "production"
            }
        ]
    }
]

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
