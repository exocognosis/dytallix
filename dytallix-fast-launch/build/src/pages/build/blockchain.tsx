import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  ArrowLeft,
  Blocks,
  ExternalLink,
  RefreshCw,
  Search,
  Timer,
  ArrowRightLeft,
} from "lucide-react"

import { Section } from "../../components/ui/Section"
import { GlassPanel } from "../../components/ui/GlassPanel"
import { Button } from "../../components/ui/Button"

type NodeStatus = {
  status?: string
  latest_height?: number
  syncing?: boolean
  mempool_size?: number
  validators?: number
  active_validators?: number
  total_validators?: number
  chain_id?: string
  timestamp?: number
}

type StakingValidatorsResponse = {
  validators?: unknown[]
  total_validators?: number
  active_validators?: number
}

type BlockSummary = {
  height?: number
  hash?: string
  timestamp?: number
  txs?: unknown[]
  asset_hashes?: unknown[]
}

type TxSummary = {
  hash?: string
  from?: string
  to?: string
  amount?: string
  denom?: string
  fee?: string
  nonce?: number
  status?: string
  timestamp?: number
  block_height?: number
}

function truncateMiddle(value: string, prefix = 8, suffix = 6) {
  if (value.length <= prefix + suffix + 3) return value
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`
}

function timeAgo(timestamp?: number) {
  if (!timestamp) return "unknown"
  const date = new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatTokenAmount(amount?: string, denom?: string) {
  const raw = Number(amount || 0)
  if (!Number.isFinite(raw)) return "0"
  const base = denom === "udrt" ? "DRT" : "DGT"
  const value = raw / 1_000_000
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${base}`
}

async function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return await res.text()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseTpsFromPrometheus(metricsText: string) {
  const match = metricsText.match(/\bdyt_tps\s+(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function buildSparklinePoints(values: number[], width = 100, height = 24, padding = 2) {
  if (!values.length) return ""
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min

  return values
    .map((v, idx) => {
      const x = values.length === 1 ? width / 2 : (idx / (values.length - 1)) * width
      const normalized = range === 0 ? 0.5 : (v - min) / range
      const y = padding + (1 - normalized) * (height - padding * 2)
      return `${x.toFixed(2)},${clampNumber(y, 0, height).toFixed(2)}`
    })
    .join(" ")
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const points = buildSparklinePoints(values)
  return (
    <svg viewBox="0 0 100 24" className={className} aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />
    </svg>
  )
}

export function BlockchainPage() {
  const nodeUrl = useMemo(
    () => (import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:3003").replace(/\/$/, ""),
    []
  )

  const quantumVaultUrl = useMemo(
    () => (import.meta.env.VITE_QUANTUMVAULT_API_URL || "http://localhost:3002").replace(/\/$/, ""),
    []
  )

  const [online, setOnline] = useState<boolean>(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [status, setStatus] = useState<NodeStatus | null>(null)
  const [tps, setTps] = useState<number>(0)
  const [blocks, setBlocks] = useState<BlockSummary[]>([])
  const [transactions, setTransactions] = useState<TxSummary[]>([])
  const [validatorCount, setValidatorCount] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const [mempoolHistory, setMempoolHistory] = useState<number[]>([])
  const [tpsHistory, setTpsHistory] = useState<number[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResult, setSearchResult] = useState<unknown | null>(null)

  const [recentAnchors, setRecentAnchors] = useState<
    Array<{
      proofId?: string
      txHash?: string
      payloadHash?: string
      filename?: string
      blockHeight?: number
      anchoredAt?: string
      status?: string
    }>
  >([])

  const intervalRef = useRef<number | null>(null)

  const refresh = async () => {
    try {
      const [statusData, blocksData, txData] = await Promise.all([
        fetchJson<NodeStatus>(`${nodeUrl}/status`),
        fetchJson<{ blocks?: BlockSummary[] }>(`${nodeUrl}/blocks?limit=10`),
        fetchJson<{ transactions?: TxSummary[] }>(`${nodeUrl}/transactions?limit=10`),
      ])

      setStatus(statusData)
      setBlocks(blocksData.blocks || [])
      setTransactions(txData.transactions || [])
      setRecentAnchors([]) // Explorer only shows blockchain data, not QuantumVault anchors
      setOnline(true)
      setLastError(null)
      setLastUpdated(Date.now())

      // Update KPI history (keep a small rolling window)
      setMempoolHistory((prev) => {
        const next = [...prev, Number(statusData?.mempool_size ?? 0)]
        return next.slice(-30)
      })

      // Optional metrics + pending txs
      try {
        const [metricsText, staking] = await Promise.all([
          fetchText(`${nodeUrl}/metrics`).catch(() => ""),
          fetchJson<StakingValidatorsResponse>(`${nodeUrl}/api/staking/validators`).catch(() => null),
        ])

        if (metricsText) {
          const nextTps = parseTpsFromPrometheus(metricsText)
          setTps(nextTps)
          setTpsHistory((prev) => {
            const next = [...prev, Number.isFinite(nextTps) ? nextTps : 0]
            return next.slice(-30)
          })
        } else {
          setTpsHistory((prev) => prev.slice(-30))
        }

        if (staking) {
          const count =
            (typeof staking.active_validators === "number" ? staking.active_validators : null) ??
            (typeof staking.total_validators === "number" ? staking.total_validators : null) ??
            (Array.isArray(staking.validators) ? staking.validators.length : null)
          if (count !== null) setValidatorCount(count)
        }
      } catch {
        // ignore optional fetches
      }
    } catch (err: unknown) {
      setOnline(false)
      const message = err instanceof Error ? err.message : "Failed to reach node"
      setLastError(message)
    }
  }

  useEffect(() => {
    refresh()
    intervalRef.current = window.setInterval(refresh, 15000) // Increased from 5s to 15s to prevent request pile-up
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeUrl])

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearchError(null)
    setSearchResult(null)
    setSearchLoading(true)

    try {
      const isQvAnchor = q.startsWith("qv_anchor_")
      const isHex64 = /^0x[0-9a-fA-F]{64}$/.test(q) || /^[0-9a-fA-F]{64}$/.test(q)
      const isWalletAddress = /^dytallix1[0-9a-z]{20,}$/i.test(q) || /^dyt1[0-9a-z]{20,}$/i.test(q)

      // 1) QuantumVault anchor lookup (qv_anchor_* or attestation/payload hash)
      if (isQvAnchor || isHex64) {
        const lookup = await fetchJson<unknown>(`${quantumVaultUrl}/anchors/lookup/${encodeURIComponent(q)}`, 7000)
        setSearchResult(lookup)
        return
      }

      // 2) Wallet address lookup
      if (isWalletAddress) {
        const [account, balance] = await Promise.all([
          fetchJson<unknown>(`${nodeUrl}/account/${encodeURIComponent(q)}`, 7000),
          fetchJson<unknown>(`${nodeUrl}/balance/${encodeURIComponent(q)}`, 7000),
        ])
        setSearchResult({ type: "wallet", address: q, account, balance })
        return
      }

      // 3) Standard chain lookup
      const isLikelyTxHash = q.startsWith("0x") || q.length >= 40
      const url = isLikelyTxHash
        ? `${nodeUrl}/transactions/${encodeURIComponent(q)}`
        : `${nodeUrl}/block/${encodeURIComponent(q)}`

      const data = await fetchJson<unknown>(url, 7000)
      setSearchResult(data)
    } catch {
      setSearchError(
        "Not found. Try a wallet address (dyt…/dytallix…), a qv_anchor_… ID, attestation hash (64 hex), tx hash (0x…), block height, block hash, or 'latest'."
      )
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <>
      <Section title="Explorer" subtitle="Live network KPIs, search, and realtime chain activity.">
        <div className="text-xs text-muted-foreground mb-2">RPC: {nodeUrl}</div>

        {!online && (
          <div className="mb-4 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            Explorer data unavailable. Ensure the blockchain node is running on <span className="font-mono">{nodeUrl}</span>.
            {lastError ? <span className="block mt-1 text-xs text-amber-300/80">Error: {lastError}</span> : null}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`inline-flex items-center gap-2 ${online ? "text-green-500" : "text-amber-500"}`}>
              <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-amber-500"}`} />
              {online ? "Node online" : "Node offline"}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="inline-flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Auto-refresh 5s
            </span>
            {lastUpdated && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>Updated {timeAgo(Math.floor(lastUpdated / 1000))}</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/build">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassPanel variant="card" className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Latest Height</p>
                <p className="text-2xl font-bold mt-1">{(status?.latest_height ?? 0).toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Blocks className="h-5 w-5" />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel variant="card" className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Mempool</p>
                <p className="text-2xl font-bold mt-1">{(status?.mempool_size ?? 0).toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 h-6">
              <Sparkline values={mempoolHistory} className="h-6 w-full text-amber-500" />
            </div>
          </GlassPanel>

          <GlassPanel variant="card" className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">TPS</p>
                <p className="text-2xl font-bold mt-1">{Number.isFinite(tps) ? tps.toFixed(2) : "0.00"}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 h-6">
              <Sparkline values={tpsHistory} className="h-6 w-full text-purple-500" />
            </div>
          </GlassPanel>

          <GlassPanel variant="card" className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Validators</p>
                <p className="text-2xl font-bold mt-1">{(validatorCount ?? status?.active_validators ?? status?.total_validators ?? status?.validators ?? 0).toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Search */}
        <div className="mt-6">
          <GlassPanel variant="card" className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Search</h3>
                <p className="text-sm text-muted-foreground">Lookup tx hash, block height/hash, or “latest”.</p>
              </div>
              <div className="flex gap-2 w-full md:max-w-xl">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="0x… tx hash • block height • block hash • latest"
                  className="glass-input flex-1 font-mono text-sm"
                />
                <Button onClick={handleSearch} disabled={!searchQuery.trim() || searchLoading}>
                  {searchLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {searchError && (
              <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {searchError}
              </div>
            )}

            {searchResult !== null && (
              <div className="mt-4 bg-black/20 rounded-lg p-4 border border-white/10">
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(searchResult, null, 2)}
                </pre>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Live activity */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassPanel variant="card" className="p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recent Blocks</h3>
              <a
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                href={`${nodeUrl}/blocks?limit=10`}
                target="_blank"
                rel="noreferrer"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left font-medium">Height</th>
                    <th className="py-2 text-left font-medium">Hash</th>
                    <th className="py-2 text-left font-medium">TX</th>
                    <th className="py-2 text-left font-medium">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No blocks yet. Start the node and wait a moment.
                      </td>
                    </tr>
                  ) : (
                    blocks.slice(0, 10).map((b, idx) => (
                      <tr key={`${b.hash || b.height || idx}`} className="border-b border-white/5">
                        <td className="py-2 font-mono">{b.height ?? "—"}</td>
                        <td className="py-2 font-mono text-muted-foreground">{b.hash ? truncateMiddle(b.hash, 10, 6) : "—"}</td>
                        <td className="py-2">{Array.isArray(b.txs) ? b.txs.length : 0}</td>
                        <td className="py-2 text-muted-foreground">{timeAgo(b.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          <GlassPanel variant="card" className="p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <a
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                href={`${quantumVaultUrl}/anchors/recent?limit=10`}
                target="_blank"
                rel="noreferrer"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2">
              {transactions.length === 0 && recentAnchors.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-white/5 border border-white/10 rounded-lg p-4">
                  No activity yet. Anchor a file in QuantumVault or send a transaction.
                </div>
              ) : (
                (() => {
                  const activity: Array<
                    | { kind: "tx"; ts: number; tx: TxSummary }
                    | {
                        kind: "qv"
                        ts: number
                        a: {
                          proofId?: string
                          txHash?: string
                          payloadHash?: string
                          filename?: string
                          blockHeight?: number
                          anchoredAt?: string
                          status?: string
                        }
                      }
                  > = []

                  for (const tx of transactions) {
                    const ts = tx.timestamp
                      ? tx.timestamp > 10_000_000_000
                        ? Math.floor(tx.timestamp / 1000)
                        : tx.timestamp
                      : 0
                    activity.push({ kind: "tx", ts, tx })
                  }

                  for (const a of recentAnchors) {
                    const ts = a.anchoredAt ? Math.floor((Date.parse(a.anchoredAt) || 0) / 1000) : 0
                    activity.push({ kind: "qv", ts, a })
                  }

                  activity.sort((x, y) => (y.ts || 0) - (x.ts || 0))
                  return activity.slice(0, 10).map((item, idx) => {
                    if (item.kind === "qv") {
                      const a = item.a
                      return (
                        <div key={`${a.txHash || a.proofId || idx}`} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">QuantumVault Anchor</div>
                              <div className="font-mono text-sm truncate">{a.txHash ? truncateMiddle(a.txHash, 14, 8) : a.proofId || "—"}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {a.filename ? a.filename : "—"} • block {a.blockHeight ?? "—"} • {timeAgo(item.ts)}
                              </div>
                              {a.payloadHash ? (
                                <div className="text-xs text-muted-foreground mt-1 font-mono truncate">{truncateMiddle(a.payloadHash, 16, 10)}</div>
                              ) : null}
                            </div>
                            <span className="text-xs px-2 py-1 rounded-md border bg-green-500/10 text-green-500 border-green-500/20">
                              {a.status || "confirmed"}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    const tx = item.tx
                    return (
                      <div key={`${tx.hash || idx}`} className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Transaction</div>
                            <div className="font-mono text-sm truncate">{tx.hash ? truncateMiddle(tx.hash, 12, 8) : "—"}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {tx.from ? truncateMiddle(tx.from, 10, 0) : "—"} → {tx.to ? truncateMiddle(tx.to, 10, 0) : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatTokenAmount(tx.amount, tx.denom)} • block {tx.block_height ?? "—"} • {timeAgo(tx.timestamp)}
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-md border ${
                              tx.status === "confirmed" || tx.status === "success"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}
                          >
                            {tx.status || "confirmed"}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          </GlassPanel>
        </div>
      </Section>
    </>
  )
}
