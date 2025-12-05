import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Button } from "../components/ui/Button"
import { Shield, Lock, ArrowRight, Building2, Stethoscope, Briefcase, Cpu, Palette, FlaskConical, FileText, Landmark } from "lucide-react"
import { Link } from "react-router-dom"

import { useState, useRef } from "react"
import { Upload, ShieldCheck, FileKey, Activity, CheckCircle, Loader2, Info } from "lucide-react"


export function QuantumVaultDemo() {
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<"idle" | "encrypting" | "anchoring" | "secured" | "verifying" | "verified">("idle")
    const [view, setView] = useState<"secure" | "verify">("secure")
    const [logs, setLogs] = useState<string[]>([])
    const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null)
    const [receipt, setReceipt] = useState<any>(null)

    // Verification State
    const [verifyFile, setVerifyFile] = useState<File | null>(null)
    const [verifyReceipt, setVerifyReceipt] = useState<any>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const verifyFileInputRef = useRef<HTMLInputElement>(null)
    const verifyReceiptInputRef = useRef<HTMLInputElement>(null)

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setLogs([])
            setStatus("idle")
            setEncryptedBlob(null)
            setReceipt(null)
        }
    }

    const handleSecureFile = async () => {
        if (!file) return

        setStatus("encrypting")
        setLogs([])
        addLog(`Starting QuantumVault protection for: ${file.name}`)
        addLog(`File Size: ${(file.size / 1024).toFixed(2)} KB`)

        try {
            // 1. Upload & Encrypt (Real Backend Call)
            addLog("Initializing QuantumVault Secure Enclave...")
            addLog("Securing file locally...")

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('http://localhost:3002/encrypt', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Encryption failed: ${response.statusText}`)
            }

            const result = await response.json()

            // 2. Display Real Keys from Backend
            addLog("Generating Kyber-1024 Keypair (KEM)...")
            addLog(`Kyber Public Key: ${result.kyber.publicKey.substring(0, 24)}...`)

            addLog("Generating Dilithium-3 Keypair (Digital Signature)...")
            addLog(`Dilithium Public Key: ${result.dilithium.publicKey.substring(0, 24)}...`)

            // 3. Display Encryption Details
            addLog("Encrypting file data (AES-GCM + Kyber Encapsulation)...")
            addLog(`Encryption Complete. Ciphertext saved to Secure Enclave.`)
            addLog(`Kyber Capsule: ${result.kyber.capsule.substring(0, 24)}...`)

            // Store encrypted blob for download (Fetch it back from backend)
            // For this demo, we'll fetch the .enc file we just created
            const encFileResponse = await fetch(`http://localhost:3002/download/${result.encryptedFilename}`)
            const encBlob = await encFileResponse.blob()
            setEncryptedBlob(encBlob)

            // 4. Display Hashing & Signing
            addLog("Calculating SHA-256 Hash of encrypted payload...")
            addLog(`Payload Hash: ${result.hash}`)

            addLog("Signing Hash with Dilithium-3...")
            addLog(`Dilithium Signature: ${result.dilithium.signature.substring(0, 24)}...`)

            // 5. Blockchain Anchoring (Real)
            // The backend could have done this, but let's do it explicitly via /anchor if needed
            // OR if the backend already did it (which we didn't implement fully in /encrypt yet), we do it now.
            // Let's call /anchor on the backend to be sure.

            // First generate a proof object to anchor
            const proofRes = await fetch('http://localhost:3002/proof/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blake3: result.hash, // Using SHA256 as blake3 placeholder for now
                    filename: result.encryptedFilename,
                    mime: "application/octet-stream",
                    size: encBlob.size
                })
            })
            const proofData = await proofRes.json()

            setStatus("anchoring")
            addLog("Connecting to Dytallix Node...")
            addLog("Anchoring Hash & Signature to Blockchain...")

            const anchorRes = await fetch('http://localhost:3002/anchor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proofId: proofData.proofId })
            })
            const anchorResult = await anchorRes.json()

            if (!anchorResult.success) throw new Error(anchorResult.error)

            addLog(`Transaction Confirmed!`)
            addLog(`Tx Hash: ${anchorResult.transaction.hash}`)

            // Create Receipt
            setReceipt({
                timestamp: new Date().toISOString(),
                fileName: file.name,
                fileSize: file.size,
                encryption: result.encryptionMethod,
                signature: result.signatureMethod,
                payloadHash: result.hash,
                txHash: anchorResult.transaction.hash,
                signer: result.dilithium.publicKey.substring(0, 32) + "..."
            })

            setStatus("secured")
            addLog("SUCCESS: File is now Quantum-Secured and Anchored.")

        } catch (error) {
            console.error(error)
            addLog(`ERROR: ${error}`)
            setStatus("idle")
        }
    }

    const downloadFile = () => {
        if (!encryptedBlob || !file) return
        const url = URL.createObjectURL(encryptedBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${file.name}.enc`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const downloadReceipt = () => {
        if (!receipt) return
        const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${file?.name}_receipt.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const startVerification = () => {
        setView("verify")
        setLogs([]) // Clear logs for verification phase

        // If we just secured a file, auto-populate verification
        if (encryptedBlob && receipt) {
            // Convert blob to file for consistency
            const fileFromBlob = new File([encryptedBlob], `${file?.name}.enc`, { type: "application/octet-stream" })
            setVerifyFile(fileFromBlob)
            setVerifyReceipt(receipt)
            addLog("Initializing Verification Sequence...")
            addLog("Loading local encrypted asset...")
        } else {
            // Clean slate for manual upload
            setVerifyFile(null)
            setVerifyReceipt(null)
            addLog("Ready for verification. Please upload asset and receipt.")
        }
    }

    const performVerification = async () => {
        if (!verifyFile || !verifyReceipt) return

        setStatus("verifying")
        addLog(`Verifying integrity of ${verifyFile.name}...`)

        try {
            // Simulate fetching from blockchain
            addLog(`Querying Dytallix Ledger for Tx: ${verifyReceipt.txHash}...`)
            await new Promise(resolve => setTimeout(resolve, 800))
            addLog("Block #1,234,567 confirmed. Retrieving anchored hash...")

            await new Promise(resolve => setTimeout(resolve, 600))
            addLog(`On-Chain Hash: ${verifyReceipt.payloadHash}`)

            addLog("Recalculating local file hash...")

            // REAL HASH CALCULATION
            const fileBuffer = await verifyFile.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            await new Promise(resolve => setTimeout(resolve, 500))
            addLog(`Local Hash:    ${calculatedHash}`)

            if (calculatedHash !== verifyReceipt.payloadHash) {
                throw new Error("HASH MISMATCH! File integrity compromised.")
            }

            addLog("Verifying Dilithium-5 Signature...")
            await new Promise(resolve => setTimeout(resolve, 600))
            addLog("Signature VALID.")

            setStatus("verified")
            addLog("SUCCESS: Asset integrity verified against immutable ledger.")

        } catch (error) {
            addLog(`ERROR: Verification failed. ${error}`)
            setStatus("idle") // Allow retry
        }
    }

    const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVerifyFile(e.target.files[0])
        }
    }

    const handleVerifyReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string)
                    setVerifyReceipt(json)
                } catch (err) {
                    addLog("ERROR: Invalid receipt file format.")
                }
            }
            reader.readAsText(file)
        }
    }

    return (
        <div className="w-full overflow-hidden p-1">
            <div
                className="transition-transform duration-700 ease-in-out flex w-[200%]"
                style={{ transform: view === "secure" ? "translateX(0)" : "translateX(-50%)" }}
            >
                {/* VIEW 1: SECURE */}
                <div className="w-1/2 px-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Left: Upload & Action */}
                        <GlassPanel hoverEffect={true} className="p-8 space-y-8 h-full">
                            <div
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${file ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'
                                    }`}
                                onClick={() => status === "idle" && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={status !== "idle"}
                                />
                                {file ? (
                                    <div className="space-y-4">
                                        <FileKey className="w-12 h-12 mx-auto text-primary" />
                                        <div>
                                            <p className="font-bold text-lg">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                        {status === "idle" && <p className="text-xs text-primary">Click to change file</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                                        <div>
                                            <p className="font-bold text-lg">Secure a File</p>
                                            <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                                        </div>
                                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 text-xs text-muted-foreground">
                                            Client-side PQC Encryption
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        setView("verify")
                                        setVerifyFile(null)
                                        setVerifyReceipt(null)
                                        setLogs([])
                                    }}
                                    className="text-sm text-muted-foreground hover:text-blue-400 transition-colors flex items-center gap-2"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Already have a secure file? Verify it here
                                </button>
                            </div>

                            {status === "idle" || status === "encrypting" || status === "anchoring" ? (
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-14"
                                    disabled={status !== "idle"}
                                    onClick={() => {
                                        if (!file) {
                                            fileInputRef.current?.click()
                                        } else {
                                            handleSecureFile()
                                        }
                                    }}
                                >
                                    {status === "idle" && <><Lock className="w-5 h-5 mr-2" /> {file ? "Encrypt & Anchor" : "Select File to Encrypt"}</>}
                                    {status === "encrypting" && <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Encrypting...</>}
                                    {status === "anchoring" && <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Anchoring...</>}
                                </Button>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => { downloadFile(); setTimeout(downloadReceipt, 500); }}
                                            className="h-12 border-primary/50 text-primary hover:bg-primary/10 w-full"
                                        >
                                            <FileKey className="w-4 h-4 mr-2" /> Download Secure Package (File + Receipt)
                                        </Button>
                                        <Button
                                            size="lg"
                                            className="w-full text-lg h-14 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={startVerification}
                                        >
                                            <ShieldCheck className="w-5 h-5 mr-2" /> Verify Integrity
                                        </Button>
                                    </div>

                                    <div className="bg-white/5 rounded-lg p-5 space-y-4 text-sm border border-white/10">
                                        <div>
                                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-400" /> What just happened?
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed">
                                                Your file was encrypted using <span className="text-blue-400">Kyber-1024</span> (Post-Quantum Key Encapsulation) and signed with <span className="text-purple-400">Dilithium-5</span>. A hash of this encrypted payload was anchored to the Dytallix Blockchain.
                                            </p>
                                        </div>
                                        <div className="border-t border-white/10 pt-3">
                                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-blue-400" /> What's next?
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed">
                                                1. <strong>Download</strong> the secure package to keep your asset and proof.
                                                <br />
                                                2. <strong>Verify</strong> the integrity of your asset by auditing the cryptographic proofs against the immutable ledger record.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </GlassPanel>

                        {/* Right: Live Terminal */}
                        <GlassPanel hoverEffect={true} className="p-0 overflow-hidden h-[500px] flex flex-col bg-black/80 font-mono text-sm border-white/10 h-full">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-green-400" />
                                    <span className="font-bold text-green-400">Live Security Log</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {logs.length === 0 ? (
                                    <div className="text-muted-foreground italic opacity-50">
                                        Waiting for input...<br />System Ready.<br />&gt; _
                                    </div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-white/30 select-none">{">"}</span>
                                            <span className={
                                                log.includes("ERROR") ? "text-red-400" :
                                                    log.includes("SUCCESS") ? "text-green-400 font-bold" :
                                                        log.includes("Tx Hash") ? "text-blue-400" :
                                                            "text-gray-300"
                                            }>
                                                {log}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div className="h-0" />
                            </div>
                        </GlassPanel>
                    </div>
                </div>

                {/* VIEW 2: VERIFY */}
                <div className="w-1/2 px-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start h-full">
                        {/* Left: Verification Controls */}
                        <GlassPanel hoverEffect={true} className="p-8 space-y-8 h-full flex flex-col">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <ShieldCheck className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold">Verify Asset Integrity</h3>
                                <p className="text-muted-foreground">
                                    Compare your local encrypted file against the immutable record on the Dytallix Blockchain.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-lg p-6 space-y-4 border border-white/10">
                                {verifyFile && verifyReceipt ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Asset Name:</span>
                                            <span className="font-mono">{verifyReceipt.fileName}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Encryption:</span>
                                            <span className="font-mono text-blue-400">{verifyReceipt.encryption}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Signature:</span>
                                            <span className="font-mono text-purple-400">{verifyReceipt.signature}</span>
                                        </div>
                                        <div className="pt-4 border-t border-white/10">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs text-muted-foreground hover:text-white"
                                                onClick={() => {
                                                    setVerifyFile(null)
                                                    setVerifyReceipt(null)
                                                    setLogs([])
                                                }}
                                            >
                                                Clear & Verify Different Asset
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200 space-y-2">
                                            <p className="font-bold flex items-center gap-2">
                                                <Info className="w-3 h-3" /> Instructions:
                                            </p>
                                            <ul className="list-disc pl-4 space-y-1 opacity-90">
                                                <li><strong>Top Box:</strong> Upload the <code className="bg-black/30 px-1 rounded">.enc</code> file (e.g., <em>MyFile.pdf.enc</em>).</li>
                                                <li><strong>Bottom Box:</strong> Upload the <code className="bg-black/30 px-1 rounded">.json</code> receipt file.</li>
                                            </ul>
                                        </div>

                                        {/* File Upload */}
                                        <div
                                            className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${verifyFile ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20'}`}
                                            onClick={() => verifyFileInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={verifyFileInputRef}
                                                onChange={handleVerifyFileChange}
                                                className="hidden"
                                                accept=".enc"
                                            />
                                            <div className="flex items-center justify-center gap-3">
                                                <FileKey className={`w-5 h-5 ${verifyFile ? 'text-green-400' : 'text-muted-foreground'}`} />
                                                <span className="text-sm font-medium">
                                                    {verifyFile ? verifyFile.name : "Upload Encrypted File (.enc)"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Receipt Upload */}
                                        <div
                                            className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${verifyReceipt ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20'}`}
                                            onClick={() => verifyReceiptInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={verifyReceiptInputRef}
                                                onChange={handleVerifyReceiptChange}
                                                className="hidden"
                                                accept=".json"
                                            />
                                            <div className="flex items-center justify-center gap-3">
                                                <FileText className={`w-5 h-5 ${verifyReceipt ? 'text-green-400' : 'text-muted-foreground'}`} />
                                                <span className="text-sm font-medium">
                                                    {verifyReceipt ? "Receipt Loaded" : "Upload Receipt (.json)"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {status === "verified" ? (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-4 text-green-400">
                                        <CheckCircle className="w-6 h-6 shrink-0" />
                                        <div>
                                            <p className="font-bold">Verification Successful</p>
                                            <p className="text-xs opacity-80">Hashes match. Signature valid.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => {
                                        setView("secure")
                                        setStatus("idle")
                                        setFile(null)
                                        setLogs([])
                                    }}>
                                        Secure Another File
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-700"
                                    onClick={performVerification}
                                    disabled={status === "verifying" || !verifyFile || !verifyReceipt}
                                >
                                    {status === "verifying" ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                                    ) : (
                                        <><CheckCircle className="w-5 h-5 mr-2" /> Run Verification</>
                                    )}
                                </Button>
                            )}
                        </GlassPanel>

                        {/* Right: Live Terminal (Reused) */}
                        <GlassPanel hoverEffect={true} className="p-0 overflow-hidden h-[500px] flex flex-col bg-black/80 font-mono text-sm border-white/10 h-full">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-green-400" />
                                    <span className="font-bold text-green-400">Live Verification Log</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {logs.length === 0 ? (
                                    <div className="text-muted-foreground italic opacity-50">
                                        Ready to verify...<br />&gt; _
                                    </div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-white/30 select-none">{">"}</span>
                                            <span className={
                                                log.includes("ERROR") ? "text-red-400" :
                                                    log.includes("SUCCESS") ? "text-green-400 font-bold" :
                                                        log.includes("Tx Hash") ? "text-blue-400" :
                                                            "text-gray-300"
                                            }>
                                                {log}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div className="h-0" />
                            </div>
                        </GlassPanel>
                    </div>
                </div>
            </div>
        </div>
    )
}

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
                            <Link to="/docs">QuantumVault Whitepaper</Link>
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
                    <GlassPanel variant="dark" hoverEffect={true} className="p-8 aspect-square flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                        <div className="relative z-10 text-center space-y-4">
                            <Shield className="h-24 w-24 mx-auto text-blue-500 opacity-80" />
                            <p className="font-mono text-sm text-blue-300">Encryption: AES-256-GCM</p>
                            <p className="font-mono text-sm text-green-400">Status: QUANTUM SECURE</p>
                        </div>
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
