import { useEffect, useMemo, useRef, useState } from "react"
import {
    AlertTriangle,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    Eye,
    FileKey,
    Info,
    KeyRound,
    Link2,
    Loader2,
    Lock,
    ShieldCheck,
    Upload,
} from "lucide-react"

import { quantumVaultDemoApi, QuantumVaultApiError } from "../features/quantum-vault-demo/api"
import { quantumVaultDemoConfig } from "../features/quantum-vault-demo/config"
import {
    clearEncryptionSessionSecrets,
    createAttestation,
    decryptAsset,
    encryptAsset,
    type EncryptionSessionSecrets,
} from "../features/quantum-vault-demo/crypto"
import {
    formatBytes,
    formatDateTime,
    parseEncryptedFilename,
    safeMimeType,
    truncateMiddle,
} from "../features/quantum-vault-demo/formatters"
import { buildAssetPreview } from "../features/quantum-vault-demo/preview"
import { Button } from "./ui/Button"
import { GlassPanel } from "./ui/GlassPanel"
import { LiveLogPanel } from "./ui/LiveLogPanel"

type SlideId = "upload-encrypt" | "attest-anchor" | "verify" | "decrypt-review" | "lifecycle"
type StageStatus = "idle" | "ready" | "processing" | "succeeded" | "failed" | "blocked"

type WorkflowError = {
    type: "validation" | "network" | "service" | "verification" | "authorization" | "crypto"
    message: string
    details?: string
}

type UploadEncryptOutput = {
    assetId: string
    assetUri: string
    encryptedFilename: string
    originalFileName: string
    mimeType: string
    size: number
    encryptedSize: number
    payloadHash: string
    originalHash: string
    envelopeId: string
    storageLocation: string
    uploadedAt: string
    status: string
    publicKeyFingerprint: string
    capsuleHex: string
    ivHex: string
}

type AttestAnchorOutput = {
    proofId: string
    attestationHash: string
    payloadHash: string
    transactionHash: string
    blockHeight: number
    submissionReference: string
    anchoredAt: string
    status: string
    attestationSignature: string
    attestationPublicKey: string
    attestationPublicKeyFingerprint: string
    attestationIssuedAt: string
}

type VerifyOutput = {
    transactionHash: string
    payloadHash: string
    attestationHash: string
    blockHeight: number
    blockHash: string | null
    timestamp: string | null
    confirmationStatus: string
    finalityStatus: string
    verificationStatus: string
    verificationTimestamp: string
    explorerUrl: string
    onChainVerified: boolean
    confirmationCount: number | null
}

type PreviewRecord = {
    kind: "text" | "json" | "image" | "pdf" | "metadata"
    title: string
    objectUrl?: string
    content?: string
    metadataLines: string[]
}

type DecryptOutput = {
    decryptionEventId: string
    authorizedIdentity: string
    assetFingerprint: string
    decryptedAt: string
    status: string
    authorizationStatus: string
    recoveredSize: number
    preview: PreviewRecord
    downloadName: string
}

type AuditEvent = {
    id: string
    stepName: string
    timestamp: string
    actor: string
    artifactProduced: string
    status: string
    associatedValues: Array<{ label: string; value: string }>
}

type LifecycleOutput = {
    completedAt: string
    banner: string
    summary: string
    events: AuditEvent[]
}

type SlideState<T> = {
    status: StageStatus
    output: T | null
    error: WorkflowError | null
}

type WorkflowState = {
    uploadEncrypt: SlideState<UploadEncryptOutput>
    attestAnchor: SlideState<AttestAnchorOutput>
    verify: SlideState<VerifyOutput>
    decryptReview: SlideState<DecryptOutput>
    lifecycle: SlideState<LifecycleOutput>
}

type SelectedAsset = {
    name: string
    mimeType: string
    size: number
    lastModified: number
}

const slides: Array<{
    id: SlideId
    label: string
    title: string
    actionLabel: string
    summary: string
}> = [
    {
        id: "upload-encrypt",
        label: "Upload / Encrypt",
        title: "Upload and Encrypt",
        actionLabel: "Upload and Encrypt",
        summary: "Secure the selected asset locally with ML-KEM-backed envelope encryption, then upload only the protected payload to QuantumVault.",
    },
    {
        id: "attest-anchor",
        label: "Attest / Anchor",
        title: "Attest and Anchor",
        actionLabel: "Attest and Anchor",
        summary: "Issue a real ML-DSA attestation over the protected payload hash and anchor the proof on Dytallix.",
    },
    {
        id: "verify",
        label: "Verify",
        title: "Verify",
        actionLabel: "Verify on Dytallix",
        summary: "Use the embedded mini-explorer to confirm the actual anchored proof record and the block that contains it without leaving the page.",
    },
    {
        id: "decrypt-review",
        label: "Decrypt / Review",
        title: "Decrypt and Review the Asset",
        actionLabel: "Decrypt and Review the Asset",
        summary: "Recover the encrypted asset through the live QuantumVault download path and decrypt it locally for review.",
    },
    {
        id: "lifecycle",
        label: "Lifecycle Audit",
        title: "Lifecycle Audit and File Recovery",
        actionLabel: "Build Lifecycle Audit",
        summary: "Render the real upload, encryption, attestation, anchoring, verification, decryption, and review record, then download the recovered file.",
    },
]

const AUTO_ADVANCE_DELAY_MS = 6000

function createInitialWorkflowState(): WorkflowState {
    return {
        uploadEncrypt: { status: "idle", output: null, error: null },
        attestAnchor: { status: "blocked", output: null, error: null },
        verify: { status: "blocked", output: null, error: null },
        decryptReview: { status: "blocked", output: null, error: null },
        lifecycle: { status: "blocked", output: null, error: null },
    }
}

function toError(error: unknown): WorkflowError {
    if (error instanceof QuantumVaultApiError) {
        return {
            type:
                error.kind === "network"
                    ? "network"
                    : error.kind === "auth"
                        ? "authorization"
                        : error.kind === "verification"
                            ? "verification"
                            : error.kind === "validation"
                                ? "validation"
                                : "service",
            message: error.message,
            details: error.details,
        }
    }

    if (error instanceof Error) {
        return {
            type: "crypto",
            message: error.message,
        }
    }

    return {
        type: "service",
        message: "Unexpected workflow failure",
    }
}

function DataField({ label, value, tone = "text-slate-200" }: { label: string; value: string; tone?: string }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
            <div className={`mt-2 break-all font-mono text-sm ${tone}`}>{value}</div>
        </div>
    )
}

function StatusBadge({ status }: { status: StageStatus }) {
    const classes: Record<StageStatus, string> = {
        idle: "border-white/10 bg-white/5 text-slate-300",
        ready: "border-blue-400/20 bg-blue-500/10 text-blue-200",
        processing: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        succeeded: "border-green-400/20 bg-green-500/10 text-green-200",
        failed: "border-red-400/20 bg-red-500/10 text-red-200",
        blocked: "border-white/5 bg-white/[0.03] text-slate-500",
    }

    return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${classes[status]}`}>{status}</span>
}

function DownloadRecoveredFileButton({ url, fileName }: { url: string | null; fileName: string | null }) {
    return (
        <Button
            variant="outline"
            className="h-12 w-full border-blue-400/20 bg-blue-500/5 text-blue-100 hover:bg-blue-500/10"
            disabled={!url || !fileName}
            onClick={() => {
                if (!url || !fileName) return
                const anchor = document.createElement("a")
                anchor.href = url
                anchor.download = fileName
                document.body.appendChild(anchor)
                anchor.click()
                document.body.removeChild(anchor)
            }}
        >
            <Download className="mr-2 h-4 w-4" /> Download Recovered File
        </Button>
    )
}

async function fetchChainTransaction(txHash: string) {
    const candidates = [
        `${quantumVaultDemoConfig.blockchainApiUrl}/tx/${encodeURIComponent(txHash)}`,
        `${quantumVaultDemoConfig.blockchainApiUrl}/transactions/${encodeURIComponent(txHash)}`,
    ]

    for (const url of candidates) {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                continue
            }
            return await response.json()
        } catch {
            continue
        }
    }

    return null
}

export function QuantumVaultDemo() {
    const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null)
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
    const [workflow, setWorkflow] = useState<WorkflowState>(createInitialWorkflowState)
    const [logs, setLogs] = useState<string[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)
    const sourceFileRef = useRef<File | null>(null)
    const sessionSecretsRef = useRef<EncryptionSessionSecrets | null>(null)
    const previewUrlsRef = useRef<string[]>([])
    const recoveredBlobUrlRef = useRef<string | null>(null)
    const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const activeSlide = slides[currentSlideIndex]
    const recoveredFileName = workflow.decryptReview.output?.downloadName || null
    const recoveredFileUrl = recoveredBlobUrlRef.current

    const clearPendingAdvance = () => {
        if (autoAdvanceTimeoutRef.current !== null) {
            clearTimeout(autoAdvanceTimeoutRef.current)
            autoAdvanceTimeoutRef.current = null
        }
    }

    useEffect(() => {
        return () => {
            clearPendingAdvance()
            clearEncryptionSessionSecrets(sessionSecretsRef.current)
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
            previewUrlsRef.current = []
            if (recoveredBlobUrlRef.current) {
                URL.revokeObjectURL(recoveredBlobUrlRef.current)
                recoveredBlobUrlRef.current = null
            }
        }
    }, [])

    const addLog = (message: string) => {
        setLogs((previous) => [...previous, `[${new Date().toLocaleTimeString()}] ${message}`])
    }

    const scheduleAdvance = () => {
        clearPendingAdvance()
        addLog(`Holding this completed state for ${AUTO_ADVANCE_DELAY_MS / 1000} seconds before advancing to the next slide.`)
        autoAdvanceTimeoutRef.current = setTimeout(() => {
            autoAdvanceTimeoutRef.current = null
            setCurrentSlideIndex((previous) => Math.min(previous + 1, slides.length - 1))
        }, AUTO_ADVANCE_DELAY_MS)
    }

    const setStageStatus = <K extends keyof WorkflowState>(key: K, status: StageStatus, error: WorkflowError | null = null) => {
        setWorkflow((previous) => ({
            ...previous,
            [key]: {
                ...previous[key],
                status,
                error,
            },
        }))
    }

    const setStageOutput = <K extends keyof WorkflowState>(key: K, output: NonNullable<WorkflowState[K]["output"]>) => {
        setWorkflow((previous) => ({
            ...previous,
            [key]: {
                status: "succeeded",
                output,
                error: null,
            },
        }))
    }

    const unlockNextStages = (nextKey: keyof WorkflowState) => {
        setWorkflow((previous) => {
            const next = { ...previous }
            if (nextKey === "attestAnchor" && !["succeeded", "processing", "failed"].includes(next.attestAnchor.status)) {
                next.attestAnchor = { ...next.attestAnchor, status: "ready" }
            }
            if (nextKey === "verify" && !["succeeded", "processing", "failed"].includes(next.verify.status)) {
                next.verify = { ...next.verify, status: "ready" }
            }
            if (nextKey === "decryptReview" && !["succeeded", "processing", "failed"].includes(next.decryptReview.status)) {
                next.decryptReview = { ...next.decryptReview, status: "ready" }
            }
            if (nextKey === "lifecycle" && !["succeeded", "processing", "failed"].includes(next.lifecycle.status)) {
                next.lifecycle = { ...next.lifecycle, status: "ready" }
            }
            return next
        })
    }

    const goToSlide = (nextIndex: number) => {
        if (nextIndex < 0 || nextIndex >= slides.length) {
            return
        }
        clearPendingAdvance()
        setCurrentSlideIndex(nextIndex)
    }

    const highestAccessibleSlide = useMemo(() => {
        const statuses = [workflow.uploadEncrypt.status, workflow.attestAnchor.status, workflow.verify.status, workflow.decryptReview.status, workflow.lifecycle.status]
        let highest = 0
        for (let index = 1; index < statuses.length; index += 1) {
            if (statuses[index] === "blocked") {
                break
            }
            highest = index
        }
        return highest
    }, [workflow])

    const resetWorkflow = () => {
        clearPendingAdvance()
        clearEncryptionSessionSecrets(sessionSecretsRef.current)
        sessionSecretsRef.current = null
        sourceFileRef.current = null
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
        previewUrlsRef.current = []
        if (recoveredBlobUrlRef.current) {
            URL.revokeObjectURL(recoveredBlobUrlRef.current)
            recoveredBlobUrlRef.current = null
        }
        setSelectedAsset(null)
        setLogs([])
        setCurrentSlideIndex(0)
        setWorkflow(createInitialWorkflowState())
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        clearPendingAdvance()
        const file = event.target.files?.[0] || null
        if (!file) {
            return
        }

        const mimeType = safeMimeType(file.type)
        const allowed = quantumVaultDemoConfig.allowedMimePrefixes.some((prefix) => mimeType.toLowerCase().startsWith(prefix.toLowerCase()))
        if (!allowed) {
            setWorkflow((previous) => ({
                ...previous,
                uploadEncrypt: {
                    ...previous.uploadEncrypt,
                    status: "failed",
                    error: {
                        type: "validation",
                        message: `The selected file type ${mimeType} is not allowed for the live demo.`,
                        details: `Allowed prefixes: ${quantumVaultDemoConfig.allowedMimePrefixes.join(", ")}`,
                    },
                },
            }))
            return
        }

        if (file.size > quantumVaultDemoConfig.maxUploadBytes) {
            setWorkflow((previous) => ({
                ...previous,
                uploadEncrypt: {
                    ...previous.uploadEncrypt,
                    status: "failed",
                    error: {
                        type: "validation",
                        message: `The selected file exceeds the configured limit of ${formatBytes(quantumVaultDemoConfig.maxUploadBytes)}.`,
                    },
                },
            }))
            return
        }

        sourceFileRef.current = file
        clearEncryptionSessionSecrets(sessionSecretsRef.current)
        sessionSecretsRef.current = null
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
        previewUrlsRef.current = []
        if (recoveredBlobUrlRef.current) {
            URL.revokeObjectURL(recoveredBlobUrlRef.current)
            recoveredBlobUrlRef.current = null
        }

        setSelectedAsset({ name: file.name, mimeType, size: file.size, lastModified: file.lastModified })
        setWorkflow({
            uploadEncrypt: { status: "ready", output: null, error: null },
            attestAnchor: { status: "blocked", output: null, error: null },
            verify: { status: "blocked", output: null, error: null },
            decryptReview: { status: "blocked", output: null, error: null },
            lifecycle: { status: "blocked", output: null, error: null },
        })
        setLogs([])
        setCurrentSlideIndex(0)
    }

    const handleUploadAndEncrypt = async () => {
        const file = sourceFileRef.current
        if (!file || !selectedAsset) {
            return
        }

        clearPendingAdvance()
        setLogs([])
        setStageStatus("uploadEncrypt", "processing")
        addLog(`Starting QuantumVault protection for: ${file.name}`)
        addLog(`File Size: ${(file.size / 1024).toFixed(2)} KB`)

        try {
            const localEncryption = await encryptAsset(file, quantumVaultDemoConfig, addLog)
            addLog("Uploading the encrypted asset to the live QuantumVault storage endpoint...")
            const upload = await quantumVaultDemoApi.uploadEncryptedAsset({
                file: localEncryption.encryptedFile,
                originalFileName: file.name,
                mimeType: selectedAsset.mimeType,
                payloadHash: localEncryption.payloadHash,
            })

            clearEncryptionSessionSecrets(sessionSecretsRef.current)
            sessionSecretsRef.current = localEncryption.secrets

            setStageOutput("uploadEncrypt", {
                assetId: upload.uri,
                assetUri: upload.uri,
                encryptedFilename: upload.encryptedFilename,
                originalFileName: file.name,
                mimeType: selectedAsset.mimeType,
                size: file.size,
                encryptedSize: localEncryption.encryptedSize,
                payloadHash: upload.payloadHash,
                originalHash: localEncryption.originalHash,
                envelopeId: localEncryption.envelopeId,
                storageLocation: upload.uri,
                uploadedAt: new Date().toISOString(),
                status: "protected-uploaded",
                publicKeyFingerprint: localEncryption.publicKeyFingerprint,
                capsuleHex: localEncryption.envelope.capsuleHex,
                ivHex: localEncryption.envelope.ivHex,
            })
            unlockNextStages("attestAnchor")
            addLog("SUCCESS: File encrypted locally and uploaded as a protected asset.")
            scheduleAdvance()
        } catch (error) {
            const workflowError = toError(error)
            setStageStatus("uploadEncrypt", "failed", workflowError)
            addLog(`ERROR: ${workflowError.message}`)
        }
    }

    const handleAttestAndAnchor = async () => {
        const upload = workflow.uploadEncrypt.output
        if (!upload) {
            return
        }

        clearPendingAdvance()
        setLogs([])
        setStageStatus("attestAnchor", "processing")
        addLog("Preparing the ML-DSA attestation package...")

        try {
            const attestation = await createAttestation(
                {
                    actorId: quantumVaultDemoConfig.actorId,
                    assetId: upload.assetId,
                    assetUri: upload.assetUri,
                    envelopeId: upload.envelopeId,
                    payloadHash: upload.payloadHash,
                    originalHash: upload.originalHash,
                    originalFileName: upload.originalFileName,
                    mimeType: upload.mimeType,
                    size: upload.size,
                },
                quantumVaultDemoConfig,
                addLog,
            )

            addLog("Issuing the proof record through the live QuantumVault proof service...")
            const proof = await quantumVaultDemoApi.generateProof({
                payloadHash: upload.payloadHash,
                filename: `${upload.originalFileName}.attestation.json`,
                mimeType: "application/json",
                size: upload.encryptedSize,
                storageLocation: upload.assetUri,
                metadata: {
                    asset_id: upload.assetId,
                    attestation_hash: attestation.attestationHash,
                    attestation_public_key: attestation.publicKeyHex,
                    attestation_signature: attestation.signatureHex,
                    envelope_id: upload.envelopeId,
                    original_hash: upload.originalHash,
                    source_filename: upload.originalFileName,
                },
            })

            addLog("Submitting the proof to Dytallix for anchoring...")
            const anchor = await quantumVaultDemoApi.anchorProof(proof.proofId)

            setStageOutput("attestAnchor", {
                proofId: anchor.proofId,
                attestationHash: attestation.attestationHash,
                payloadHash: upload.payloadHash,
                transactionHash: anchor.transactionHash,
                blockHeight: anchor.blockHeight,
                submissionReference: anchor.proofId,
                anchoredAt: anchor.anchoredAt,
                status: anchor.status,
                attestationSignature: attestation.signatureHex,
                attestationPublicKey: attestation.publicKeyHex,
                attestationPublicKeyFingerprint: attestation.publicKeyFingerprint,
                attestationIssuedAt: attestation.issuedAt,
            })
            unlockNextStages("verify")
            addLog(`SUCCESS: Proof ${anchor.proofId} anchored on Dytallix at block ${anchor.blockHeight}.`)
            scheduleAdvance()
        } catch (error) {
            const workflowError = toError(error)
            setStageStatus("attestAnchor", "failed", workflowError)
            addLog(`ERROR: ${workflowError.message}`)
        }
    }

    const handleVerify = async () => {
        const anchor = workflow.attestAnchor.output
        if (!anchor) {
            return
        }

        clearPendingAdvance()
        setLogs([])
        setStageStatus("verify", "processing")
        addLog("Loading the anchored proof record from QuantumVault explorer lookup...")

        try {
            const lookup = await quantumVaultDemoApi.lookupAnchor(anchor.transactionHash)
            addLog("Validating the anchored payload hash and attestation signature against Dytallix...")
            const verification = await quantumVaultDemoApi.verifyTransaction({
                transactionHash: anchor.transactionHash,
                payloadHash: anchor.payloadHash,
                signatureHex: anchor.attestationSignature,
                publicKeyHex: anchor.attestationPublicKey,
            })

            if (!lookup.onChainVerified) {
                throw new Error("The Dytallix lookup did not confirm the anchored proof relationship.")
            }

            if (!verification.signatureValid) {
                throw new Error(verification.signatureMessage)
            }

            const chainStatus = await quantumVaultDemoApi.fetchBlockchainStatus().catch(() => ({ latestHeight: null }))
            const chainTx = await fetchChainTransaction(anchor.transactionHash)
            const confirmationCount = chainStatus.latestHeight === null ? null : Math.max(chainStatus.latestHeight - verification.blockHeight + 1, 0)
            const explorerUrl = `${quantumVaultDemoConfig.explorerBaseUrl}?search=${encodeURIComponent(anchor.transactionHash)}`

            setStageOutput("verify", {
                transactionHash: anchor.transactionHash,
                payloadHash: anchor.payloadHash,
                attestationHash: anchor.attestationHash,
                blockHeight: verification.blockHeight,
                blockHash: typeof chainTx?.block_hash === "string" ? chainTx.block_hash : typeof chainTx?.blockHash === "string" ? chainTx.blockHash : null,
                timestamp: verification.timestamp || (typeof chainTx?.timestamp === "string" ? chainTx.timestamp : lookup.anchoredAt),
                confirmationStatus: confirmationCount === null ? verification.status : `${confirmationCount} confirmations observed`,
                finalityStatus: verification.status,
                verificationStatus: "verified",
                verificationTimestamp: new Date().toISOString(),
                explorerUrl,
                onChainVerified: true,
                confirmationCount,
            })
            unlockNextStages("decryptReview")
            addLog(`SUCCESS: File proof anchored and attested in block ${verification.blockHeight}.`)
            scheduleAdvance()
        } catch (error) {
            const workflowError = toError(error)
            setStageStatus("verify", "failed", workflowError)
            addLog(`ERROR: ${workflowError.message}`)
        }
    }

    const handleDecryptAndReview = async () => {
        const upload = workflow.uploadEncrypt.output
        const verification = workflow.verify.output
        const session = sessionSecretsRef.current
        if (!upload || !verification || !session) {
            return
        }

        clearPendingAdvance()
        setLogs([])
        setStageStatus("decryptReview", "processing")
        addLog("Authorizing local recovery from the ML-KEM session envelope.")

        try {
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
            previewUrlsRef.current = []
            if (recoveredBlobUrlRef.current) {
                URL.revokeObjectURL(recoveredBlobUrlRef.current)
                recoveredBlobUrlRef.current = null
            }

            addLog("Downloading the protected asset from the live QuantumVault storage endpoint...")
            const download = await quantumVaultDemoApi.downloadEncryptedAsset(upload.assetId)
            addLog(`Recovered encrypted asset ${parseEncryptedFilename(upload.assetId)} from storage.`)

            const decrypted = await decryptAsset(download.bytes, session, quantumVaultDemoConfig, addLog)
            if (decrypted.recoveredHash !== upload.originalHash) {
                throw new Error("Recovered asset fingerprint does not match the original local asset fingerprint.")
            }

            const preview = await buildAssetPreview(upload.originalFileName, upload.mimeType, decrypted.bytes)
            if (preview.objectUrl) {
                previewUrlsRef.current.push(preview.objectUrl)
            }

            const recoveredBytes = Uint8Array.from(decrypted.bytes)
            const recoveredBlob = new Blob([recoveredBytes], { type: upload.mimeType })
            recoveredBlobUrlRef.current = URL.createObjectURL(recoveredBlob)

            setStageOutput("decryptReview", {
                decryptionEventId: crypto.randomUUID(),
                authorizedIdentity: `Local recovery key ${session.publicKeyFingerprint}`,
                assetFingerprint: decrypted.recoveredHash,
                decryptedAt: new Date().toISOString(),
                status: "decrypted",
                authorizationStatus: verification.onChainVerified ? "Authorized after live Dytallix verification" : "Authorization denied",
                recoveredSize: decrypted.bytes.byteLength,
                preview,
                downloadName: upload.originalFileName,
            })
            unlockNextStages("lifecycle")
            addLog("SUCCESS: Asset decrypted locally and rendered for review.")
            scheduleAdvance()
        } catch (error) {
            const workflowError = toError(error)
            setStageStatus("decryptReview", "failed", workflowError)
            addLog(`ERROR: ${workflowError.message}`)
        }
    }

    const handleBuildLifecycle = async () => {
        const upload = workflow.uploadEncrypt.output
        const anchor = workflow.attestAnchor.output
        const verify = workflow.verify.output
        const decrypt = workflow.decryptReview.output
        if (!upload || !anchor || !verify || !decrypt) {
            return
        }

        setLogs([])
        setStageStatus("lifecycle", "processing")
        addLog("Normalizing the real workflow outputs into the lifecycle audit trail...")

        try {
            const events: AuditEvent[] = [
                {
                    id: `${upload.assetId}:upload`,
                    stepName: "Upload",
                    timestamp: upload.uploadedAt,
                    actor: quantumVaultDemoConfig.actorId,
                    artifactProduced: upload.assetId,
                    status: upload.status,
                    associatedValues: [
                        { label: "Asset ID", value: upload.assetId },
                        { label: "File", value: upload.originalFileName },
                    ],
                },
                {
                    id: `${upload.assetId}:encrypt`,
                    stepName: "Encryption",
                    timestamp: upload.uploadedAt,
                    actor: `${quantumVaultDemoConfig.kemAlgorithm} browser envelope`,
                    artifactProduced: upload.envelopeId,
                    status: "protected",
                    associatedValues: [
                        { label: "Payload hash", value: upload.payloadHash },
                        { label: "Envelope ID", value: upload.envelopeId },
                    ],
                },
                {
                    id: `${anchor.proofId}:attest`,
                    stepName: "Attestation",
                    timestamp: anchor.attestationIssuedAt,
                    actor: quantumVaultDemoConfig.signatureAlgorithm,
                    artifactProduced: anchor.attestationHash,
                    status: "signed",
                    associatedValues: [
                        { label: "Payload hash", value: anchor.payloadHash },
                        { label: "Proof ID", value: anchor.proofId },
                    ],
                },
                {
                    id: `${anchor.proofId}:anchor`,
                    stepName: "Anchoring",
                    timestamp: anchor.anchoredAt,
                    actor: "Dytallix / QuantumVault API",
                    artifactProduced: anchor.transactionHash,
                    status: anchor.status,
                    associatedValues: [
                        { label: "Block height", value: String(anchor.blockHeight) },
                        { label: "Submission reference", value: anchor.submissionReference },
                    ],
                },
                {
                    id: `${anchor.proofId}:verify`,
                    stepName: "Verification",
                    timestamp: verify.verificationTimestamp,
                    actor: "Embedded Dytallix verifier",
                    artifactProduced: verify.transactionHash,
                    status: verify.verificationStatus,
                    associatedValues: [
                        { label: "Block hash", value: verify.blockHash || "Unavailable" },
                        { label: "Finality", value: verify.finalityStatus },
                    ],
                },
                {
                    id: `${decrypt.decryptionEventId}:decrypt`,
                    stepName: "Decryption",
                    timestamp: decrypt.decryptedAt,
                    actor: decrypt.authorizedIdentity,
                    artifactProduced: decrypt.decryptionEventId,
                    status: decrypt.status,
                    associatedValues: [
                        { label: "Asset fingerprint", value: decrypt.assetFingerprint },
                        { label: "Authorization", value: decrypt.authorizationStatus },
                    ],
                },
                {
                    id: `${decrypt.decryptionEventId}:review`,
                    stepName: "Review",
                    timestamp: decrypt.decryptedAt,
                    actor: "QuantumVault review console",
                    artifactProduced: decrypt.downloadName,
                    status: "rendered",
                    associatedValues: [
                        { label: "Preview kind", value: decrypt.preview.kind },
                        { label: "Recovered size", value: formatBytes(decrypt.recoveredSize) },
                    ],
                },
            ]

            setStageOutput("lifecycle", {
                completedAt: new Date().toISOString(),
                banner: "PQC Lifecycle Complete",
                summary:
                    "The uploaded asset was encrypted under a live ML-KEM browser envelope, attested with ML-DSA, anchored on Dytallix, verified against the actual on-chain record, decrypted locally, and recovered for review and download.",
                events,
            })
            addLog("SUCCESS: Auditable lifecycle record built from real workflow state.")
        } catch (error) {
            const workflowError = toError(error)
            setStageStatus("lifecycle", "failed", workflowError)
            addLog(`ERROR: ${workflowError.message}`)
        }
    }

    const activeError =
        activeSlide.id === "upload-encrypt"
            ? workflow.uploadEncrypt.error
            : activeSlide.id === "attest-anchor"
                ? workflow.attestAnchor.error
                : activeSlide.id === "verify"
                    ? workflow.verify.error
                    : activeSlide.id === "decrypt-review"
                        ? workflow.decryptReview.error
                        : workflow.lifecycle.error

    return (
        <div className="w-full overflow-hidden p-1">
            <div className="flex w-[500%] transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentSlideIndex * 20}%)` }}>
                <div className="w-1/5 px-1">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <GlassPanel hoverEffect={true} className="h-full space-y-8 p-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{slides[0].label}</div>
                                        <h3 className="mt-2 text-2xl font-bold text-white">{slides[0].title}</h3>
                                    </div>
                                    <StatusBadge status={workflow.uploadEncrypt.status} />
                                </div>
                                <p className="text-muted-foreground">{slides[0].summary}</p>
                            </div>

                            <div
                                className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${selectedAsset ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20"}`}
                                onClick={() => workflow.uploadEncrypt.status !== "processing" && fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={workflow.uploadEncrypt.status === "processing"} />
                                {selectedAsset ? (
                                    <div className="space-y-4">
                                        <FileKey className="mx-auto h-12 w-12 text-primary" />
                                        <div>
                                            <p className="text-lg font-bold">{selectedAsset.name}</p>
                                            <p className="text-sm text-muted-foreground">{formatBytes(selectedAsset.size)}</p>
                                        </div>
                                        {workflow.uploadEncrypt.status !== "processing" ? <p className="text-xs text-primary">Click to change file</p> : null}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <div>
                                            <p className="text-lg font-bold">Secure a File</p>
                                            <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                                        </div>
                                        <div className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">Client-side PQC encryption</div>
                                    </div>
                                )}
                            </div>

                            <Button size="lg" className="h-14 w-full text-lg" disabled={!selectedAsset || workflow.uploadEncrypt.status === "processing"} onClick={handleUploadAndEncrypt}>
                                {workflow.uploadEncrypt.status === "processing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Encrypting...</> : <><Lock className="mr-2 h-5 w-5" /> {slides[0].actionLabel}</>}
                            </Button>

                            {workflow.uploadEncrypt.output ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <DataField label="Asset ID" value={workflow.uploadEncrypt.output.assetId} />
                                    <DataField label="Payload hash" value={workflow.uploadEncrypt.output.payloadHash} tone="text-blue-200" />
                                    <DataField label="Encryption envelope ID" value={workflow.uploadEncrypt.output.envelopeId} tone="text-green-200" />
                                    <DataField label="Timestamp" value={formatDateTime(workflow.uploadEncrypt.output.uploadedAt)} />
                                    <DataField label="Status" value={workflow.uploadEncrypt.output.status} tone="text-green-200" />
                                    <DataField label="Stored as" value={workflow.uploadEncrypt.output.encryptedFilename} />
                                </div>
                            ) : null}
                        </GlassPanel>

                        <LiveLogPanel logs={logs} title="Live Security Log" emptyMessage={"Waiting for input...\nSystem Ready.\n> _"} />
                    </div>
                </div>

                <div className="w-1/5 px-1">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <GlassPanel hoverEffect={true} className="h-full space-y-8 p-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{slides[1].label}</div>
                                        <h3 className="mt-2 text-2xl font-bold text-white">{slides[1].title}</h3>
                                    </div>
                                    <StatusBadge status={workflow.attestAnchor.status} />
                                </div>
                                <p className="text-muted-foreground">{slides[1].summary}</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <DataField label="Asset ID" value={workflow.uploadEncrypt.output?.assetId || "Blocked"} />
                                <DataField label="Payload hash" value={workflow.uploadEncrypt.output?.payloadHash || "Blocked"} tone="text-blue-200" />
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm leading-7 text-muted-foreground">
                                The attestation stage signs the protected payload hash with {quantumVaultDemoConfig.signatureAlgorithm}, creates a real proof record, and submits that proof to Dytallix for anchoring.
                            </div>

                            <Button size="lg" className="h-14 w-full bg-green-600 text-lg text-white hover:bg-green-700" disabled={workflow.attestAnchor.status === "processing" || workflow.uploadEncrypt.status !== "succeeded"} onClick={handleAttestAndAnchor}>
                                {workflow.attestAnchor.status === "processing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Anchoring...</> : <><Link2 className="mr-2 h-5 w-5" /> {slides[1].actionLabel}</>}
                            </Button>

                            {workflow.attestAnchor.output ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <DataField label="Attestation hash" value={workflow.attestAnchor.output.attestationHash} tone="text-green-200" />
                                    <DataField label="Payload hash" value={workflow.attestAnchor.output.payloadHash} tone="text-blue-200" />
                                    <DataField label="Transaction hash" value={workflow.attestAnchor.output.transactionHash} tone="text-green-200" />
                                    <DataField label="Block reference" value={`Height ${workflow.attestAnchor.output.blockHeight}`} />
                                    <DataField label="Anchored at" value={formatDateTime(workflow.attestAnchor.output.anchoredAt)} />
                                    <DataField label="Status" value={workflow.attestAnchor.output.status} tone="text-green-200" />
                                </div>
                            ) : null}
                        </GlassPanel>

                        <LiveLogPanel logs={logs} title="Live Attestation Log" emptyMessage={"Awaiting anchored proof request...\n> _"} />
                    </div>
                </div>

                <div className="w-1/5 px-1">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <GlassPanel hoverEffect={true} className="h-full space-y-8 p-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{slides[2].label}</div>
                                        <h3 className="mt-2 text-2xl font-bold text-white">{slides[2].title}</h3>
                                    </div>
                                    <StatusBadge status={workflow.verify.status} />
                                </div>
                                <p className="text-muted-foreground">{slides[2].summary}</p>
                            </div>

                            <Button size="lg" className="h-14 w-full bg-blue-600 text-lg text-white hover:bg-blue-700" disabled={workflow.verify.status === "processing" || workflow.attestAnchor.status !== "succeeded"} onClick={handleVerify}>
                                {workflow.verify.status === "processing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : <><ShieldCheck className="mr-2 h-5 w-5" /> {slides[2].actionLabel}</>}
                            </Button>

                            <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-6">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mini Explorer</div>
                                        <div className="mt-2 text-lg font-semibold text-white">Embedded Dytallix verification console</div>
                                    </div>
                                    {workflow.verify.output ? (
                                        <a className="inline-flex items-center gap-2 text-sm font-medium text-blue-200 hover:text-blue-100" href={workflow.verify.output.explorerUrl} target="_blank" rel="noreferrer">
                                            Open in Explorer
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <DataField label="Transaction hash" value={workflow.verify.output?.transactionHash || workflow.attestAnchor.output?.transactionHash || "Pending"} tone="text-green-200" />
                                    <DataField label="Payload hash" value={workflow.verify.output?.payloadHash || workflow.attestAnchor.output?.payloadHash || "Pending"} tone="text-blue-200" />
                                    <DataField label="Attestation hash" value={workflow.verify.output?.attestationHash || workflow.attestAnchor.output?.attestationHash || "Pending"} tone="text-green-200" />
                                    <DataField label="Block height" value={workflow.verify.output ? String(workflow.verify.output.blockHeight) : "Pending"} />
                                    <DataField label="Block hash" value={workflow.verify.output?.blockHash || "Pending"} />
                                    <DataField label="Timestamp" value={formatDateTime(workflow.verify.output?.timestamp)} />
                                    <DataField label="Confirmation status" value={workflow.verify.output?.confirmationStatus || "Pending"} />
                                    <DataField label="Verification status" value={workflow.verify.output?.verificationStatus || "Pending"} tone="text-green-200" />
                                </div>

                                {workflow.verify.output ? <div className="mt-5 rounded-lg border border-green-400/20 bg-green-500/10 p-4 text-sm text-green-100">The file proof is anchored and attested in block {workflow.verify.output.blockHeight}{workflow.verify.output.blockHash ? ` (${truncateMiddle(workflow.verify.output.blockHash, 14, 12)})` : ""}.</div> : null}
                            </div>
                        </GlassPanel>

                        <LiveLogPanel logs={logs} title="Live Verification Log" emptyMessage={"Ready to verify on Dytallix...\n> _"} />
                    </div>
                </div>

                <div className="w-1/5 px-1">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <GlassPanel hoverEffect={true} className="h-full space-y-8 p-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{slides[3].label}</div>
                                        <h3 className="mt-2 text-2xl font-bold text-white">{slides[3].title}</h3>
                                    </div>
                                    <StatusBadge status={workflow.decryptReview.status} />
                                </div>
                                <p className="text-muted-foreground">{slides[3].summary}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <DataField label="Asset ID" value={workflow.uploadEncrypt.output?.assetId || "Pending"} />
                                <DataField label="Authorization" value={workflow.verify.status === "succeeded" ? "Verified and eligible for local recovery" : "Blocked until verification succeeds"} tone="text-amber-200" />
                            </div>

                            <Button size="lg" className="h-14 w-full bg-amber-500 text-lg text-black hover:bg-amber-400" disabled={workflow.decryptReview.status === "processing" || workflow.verify.status !== "succeeded"} onClick={handleDecryptAndReview}>
                                {workflow.decryptReview.status === "processing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Decrypting...</> : <><KeyRound className="mr-2 h-5 w-5" /> {slides[3].actionLabel}</>}
                            </Button>

                            {workflow.decryptReview.output ? (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <DataField label="Decryption event ID" value={workflow.decryptReview.output.decryptionEventId} />
                                        <DataField label="Authorized identity" value={workflow.decryptReview.output.authorizedIdentity} tone="text-green-200" />
                                        <DataField label="Asset fingerprint" value={workflow.decryptReview.output.assetFingerprint} tone="text-blue-200" />
                                        <DataField label="Decrypted at" value={formatDateTime(workflow.decryptReview.output.decryptedAt)} />
                                        <DataField label="Status" value={workflow.decryptReview.output.status} tone="text-green-200" />
                                        <DataField label="Recovered size" value={formatBytes(workflow.decryptReview.output.recoveredSize)} />
                                    </div>

                                    <GlassPanel variant="card" className="border-white/10 bg-white/5 p-5">
                                        <div className="flex items-center gap-3">
                                            <Eye className="h-5 w-5 text-amber-200" />
                                            <div className="text-lg font-semibold text-white">{workflow.decryptReview.output.preview.title}</div>
                                        </div>
                                        <div className="mt-5 space-y-4">
                                            {workflow.decryptReview.output.preview.kind === "image" && workflow.decryptReview.output.preview.objectUrl ? <img alt="Recovered asset preview" className="max-h-[280px] w-full rounded-xl border border-white/10 object-contain" src={workflow.decryptReview.output.preview.objectUrl} /> : null}
                                            {workflow.decryptReview.output.preview.kind === "pdf" && workflow.decryptReview.output.preview.objectUrl ? <iframe className="h-[280px] w-full rounded-xl border border-white/10 bg-white" src={workflow.decryptReview.output.preview.objectUrl} title="Recovered PDF preview" /> : null}
                                            {workflow.decryptReview.output.preview.content ? <pre className="max-h-[280px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-200">{workflow.decryptReview.output.preview.content}</pre> : null}
                                            <div className="grid grid-cols-1 gap-3">
                                                {workflow.decryptReview.output.preview.metadataLines.map((line) => (
                                                    <div key={line} className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </GlassPanel>
                                </div>
                            ) : null}
                        </GlassPanel>

                        <LiveLogPanel logs={logs} title="Live Recovery Log" emptyMessage={"Recovery path locked until verification succeeds...\n> _"} />
                    </div>
                </div>

                <div className="w-1/5 px-1">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <GlassPanel hoverEffect={true} className="h-full space-y-8 p-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{slides[4].label}</div>
                                        <h3 className="mt-2 text-2xl font-bold leading-tight text-white">Review the PQC-lifecycled digital asset through an auditable lifecycle display</h3>
                                    </div>
                                    <StatusBadge status={workflow.lifecycle.status} />
                                </div>
                                <p className="text-muted-foreground">{slides[4].summary}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <Button size="lg" className="h-14 w-full bg-green-600 text-lg text-white hover:bg-green-700" disabled={workflow.lifecycle.status === "processing" || workflow.decryptReview.status !== "succeeded"} onClick={handleBuildLifecycle}>
                                    {workflow.lifecycle.status === "processing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Building audit...</> : <><CheckCircle className="mr-2 h-5 w-5" /> {slides[4].actionLabel}</>}
                                </Button>
                                <DownloadRecoveredFileButton url={recoveredFileUrl} fileName={recoveredFileName} />
                            </div>

                            {workflow.lifecycle.output ? (
                                <div className="space-y-5">
                                    <div className="rounded-lg border border-green-400/20 bg-green-500/10 p-5">
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-green-200">Lifecycle completion</div>
                                        <div className="mt-2 text-2xl font-semibold text-white">{workflow.lifecycle.output.banner}</div>
                                        <p className="mt-3 text-sm leading-7 text-green-50/90">{workflow.lifecycle.output.summary}</p>
                                    </div>

                                    <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30">
                                        <div className="divide-y divide-white/10">
                                            {workflow.lifecycle.output.events.map((event) => (
                                                <div key={event.id} className="space-y-3 p-5">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="text-sm font-semibold text-white">{event.stepName}</div>
                                                        <div className="text-xs uppercase tracking-[0.18em] text-green-200">{event.status}</div>
                                                    </div>
                                                    <div className="text-xs text-slate-400">{formatDateTime(event.timestamp)} · {event.actor}</div>
                                                    <div className="break-all rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-200">{event.artifactProduced}</div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        {event.associatedValues.map((item) => (
                                                            <DataField key={`${event.id}-${item.label}`} label={item.label} value={item.value} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-4 text-sm text-blue-100">
                                        Download the recovered file above to confirm it matches the asset you originally uploaded and carried through the full PQC lifecycle.
                                    </div>
                                </div>
                            ) : null}
                        </GlassPanel>

                        <LiveLogPanel logs={logs} title="Lifecycle Audit Log" emptyMessage={"Lifecycle audit will render from real workflow state...\n> _"} />
                    </div>
                </div>
            </div>

            {activeError ? (
                <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <div className="font-semibold uppercase tracking-[0.18em]">{activeError.type}</div>
                            <div className="mt-2 leading-7">{activeError.message}</div>
                            {activeError.details ? <div className="mt-2 text-red-200/80">{activeError.details}</div> : null}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Forward navigation remains locked until the current card succeeds. Completed cards now remain visible for 6 seconds before auto-advancing.
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-red-400/20 bg-red-500/5 text-red-100 hover:bg-red-500/10" onClick={resetWorkflow}>
                        Reset Demo
                    </Button>
                    <Button variant="outline" disabled={currentSlideIndex === 0} onClick={() => goToSlide(currentSlideIndex - 1)}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" disabled={currentSlideIndex >= highestAccessibleSlide} onClick={() => goToSlide(currentSlideIndex + 1)}>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <GlassPanel variant="card" className="border-white/10 bg-black/20 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Why it matters</div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">The same glassmorphism experience now carries a real end-to-end PQC asset journey instead of splitting secure and verify into disconnected screens.</div>
                </GlassPanel>
                <GlassPanel variant="card" className="border-white/10 bg-black/20 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">What is on-chain</div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">Dytallix records proof and attestation evidence. The encrypted asset remains off-chain in QuantumVault-managed storage, and the recovered file download is produced only after successful verification and local decryption.</div>
                </GlassPanel>
                <GlassPanel variant="card" className="border-white/10 bg-black/20 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Failure mode</div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">Missing services, broken proofs, failed verification, or decrypt mismatches fail closed. The component does not fall back to mock states or placeholder audit rows.</div>
                </GlassPanel>
            </div>
        </div>
    )
}
