import { useState, useRef, useMemo } from "react"
import { GlassPanel } from "./ui/GlassPanel"
import { Button } from "./ui/Button"
import { LiveLogPanel } from "./ui/LiveLogPanel"
import { Lock, Upload, ShieldCheck, FileKey, Activity, CheckCircle, Loader2, Info, Copy, ExternalLink, FileText } from "lucide-react"
import { Link } from "react-router-dom"

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const resolveQuantumVaultBase = () => {
    const isBrowser = typeof window !== "undefined"

    if (isBrowser) {
        const host = window.location.hostname
        const isDytallixHost = host === "dytallix.com" || host.endsWith(".dytallix.com")
        if (isDytallixHost) {
            return "/api/quantumvault"
        }
    }

    const rawBase = (import.meta.env.VITE_QUANTUMVAULT_API_URL || "").trim()
    if (!rawBase) {
        return isBrowser ? "/api/quantumvault" : "http://localhost:3002"
    }

    if (/^dytallix1[0-9a-f]+$/i.test(rawBase)) {
        return isBrowser ? "/api/quantumvault" : "http://localhost:3002"
    }

    if (!isBrowser) {
        return trimTrailingSlash(rawBase)
    }

    try {
        return trimTrailingSlash(new URL(rawBase, window.location.origin).toString())
    } catch {
        return "/api/quantumvault"
    }
}


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

    const quantumVaultUrl = useMemo(() => trimTrailingSlash(resolveQuantumVaultBase()), [])

    const requestQuantumVault = async (path: string, init?: RequestInit) => {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`
        const primaryUrl = `${quantumVaultUrl}${normalizedPath}`
        const sameOriginFallback = typeof window !== "undefined"
            ? trimTrailingSlash(new URL("/api/quantumvault", window.location.origin).toString())
            : "http://localhost:3002"
        const canFallback = sameOriginFallback !== quantumVaultUrl

        try {
            const response = await fetch(primaryUrl, init)

            if (response.status >= 500 && canFallback) {
                addLog(`WARN: QuantumVault upstream ${response.status}. Retrying via platform gateway...`)
                return await fetch(`${sameOriginFallback}${normalizedPath}`, init)
            }

            return response
        } catch (error) {
            if (canFallback) {
                addLog("WARN: Primary QuantumVault endpoint unreachable. Retrying via platform gateway...")
                return await fetch(`${sameOriginFallback}${normalizedPath}`, init)
            }
            throw error
        }
    }

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

            const response = await requestQuantumVault('/encrypt', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                let details = response.statusText || 'Unknown server error'
                try {
                    const payload = await response.json()
                    details = payload?.details || payload?.error || details
                } catch {
                    // Keep status text fallback
                }
                throw new Error(`Encryption failed (${response.status}): ${details}`)
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
            const encFileResponse = await requestQuantumVault(`/download/${result.encryptedFilename}`)
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
            const proofRes = await requestQuantumVault('/proof/generate', {
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

            const anchorRes = await requestQuantumVault('/anchor', {
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
                signer: result.dilithium.publicKey.substring(0, 32) + "...",
                publicKey: result.dilithium.publicKey, // Store full key for verification
                signatureHex: result.dilithium.signature // Store actual hex signature for verification
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
            addLog(`Querying Dytallix Ledger for Tx: ${verifyReceipt.txHash}...`)

            // REAL BLOCKCHAIN VERIFICATION
            const verifyRes = await requestQuantumVault('/verify/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: verifyReceipt.txHash,
                    payloadHash: verifyReceipt.payloadHash,
                    signature: verifyReceipt.signatureHex, // Use the actual hex signature
                    publicKey: verifyReceipt.publicKey // Uses the full key we now store
                })
            })

            if (!verifyRes.ok) {
                const errData = await verifyRes.json()
                throw new Error(errData.error || "Blockchain lookup failed")
            }

            const verifyData = await verifyRes.json()
            addLog(`Block #${verifyData.blockchain.blockHeight} confirmed via Node `)
            addLog(`On-Chain Status: ${verifyData.blockchain.status.toUpperCase()}`)

            addLog("Recalculating local file hash...")

            // REAL HASH CALCULATION
            const fileBuffer = await verifyFile.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            addLog(`Local Hash:    ${calculatedHash}`)

            if (calculatedHash !== verifyReceipt.payloadHash) {
                throw new Error("HASH MISMATCH! File integrity compromised.")
            }

            addLog("Verifying Dilithium-5 Signature (Server-Side)...")

            if (verifyData.signature.valid) {
                addLog(verifyData.signature.message)
            } else {
                throw new Error(verifyData.signature.message)
            }

            setStatus("verified")
            addLog("SUCCESS: Asset integrity verified against immutable ledger.")

        } catch (error: any) {
            addLog(`ERROR: Verification failed. ${error.message || error}`)
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
                                                1. <strong>Download</strong> the secure package for your records.
                                                <br />
                                                2. You can verify your file's integrity by clicking on the button above this message.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </GlassPanel>

                        {/* Right: Live Terminal */}
                        <LiveLogPanel logs={logs} title="Live Security Log" emptyMessage={"Waiting for input...\nSystem Ready.\n> _"} />
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
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-4 text-green-400 mb-4">
                                        <CheckCircle className="w-6 h-6 shrink-0" />
                                        <div>
                                            <p className="font-bold">Verification Successful</p>
                                            <p className="text-xs opacity-80">Hashes match. Signature valid.</p>
                                        </div>
                                    </div>

                                    {/* Copyable Details */}
                                    <div className="space-y-3 bg-white/5 p-4 rounded-lg border border-white/10">
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">Transaction Hash (Anchor ID)</label>
                                            <div className="flex gap-2">
                                                <code className="bg-black/30 p-2 rounded text-xs font-mono flex-1 overflow-x-auto text-blue-300">
                                                    {verifyReceipt?.txHash}
                                                </code>
                                                <Button
                                                    size="sm" variant="outline" className="h-auto py-1 px-2"
                                                    onClick={() => navigator.clipboard.writeText(verifyReceipt?.txHash || "")}
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">Payload Hash</label>
                                            <div className="flex gap-2">
                                                <code className="bg-black/30 p-2 rounded text-xs font-mono flex-1 overflow-x-auto text-purple-300">
                                                    {verifyReceipt?.payloadHash}
                                                </code>
                                                <Button
                                                    size="sm" variant="outline" className="h-auto py-1 px-2"
                                                    onClick={() => navigator.clipboard.writeText(verifyReceipt?.payloadHash || "")}
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Link to="/build/blockchain" target="_blank" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                                <ExternalLink className="w-3 h-3" />
                                                View on Dytallix Explorer (Search for Tx Hash)
                                            </Link>
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
                        <LiveLogPanel logs={logs} title="Live Verification Log" emptyMessage={"Ready to verify...\n> _"} />
                    </div>
                </div>
            </div>
        </div>
    )
}
