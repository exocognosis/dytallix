// CosmJS adapter for balances, tx build/sign/broadcast, and WS subscribe
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient } from '@cosmjs/stargate'

const M = (import.meta as any)
const LCD = M.env?.VITE_LCD_HTTP_URL || 'http://localhost:1317'
const RPC = M.env?.VITE_RPC_HTTP_URL || 'http://localhost:26657'
const WS = M.env?.VITE_RPC_WS_URL || 'ws://localhost:26657/websocket'
const CHAIN_ID = String(M.env?.VITE_CHAIN_ID || 'dytallix-local') // ensure string
const BECH32_PREFIX = M.env?.VITE_BECH32_PREFIX || 'dyt'

export function getChainId(): string { return CHAIN_ID }
export function getWsUrl(): string { return WS }
export function getRpcHttpUrl(): string { return RPC }
export function getLcdUrl(): string { return LCD }

export async function getBalances(addr: string) {
  const url = `${LCD}/cosmos/bank/v1beta1/balances/${addr}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`LCD error ${r.status}`)
  const j = await r.json()
  return j
}

export async function buildAndBroadcastTx({ fromMnemonic, msgs, fee, memo }:{ fromMnemonic: string, msgs: any[], fee: any, memo?: string }) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(fromMnemonic, { prefix: BECH32_PREFIX })
  const [account] = await wallet.getAccounts()
  const client = await SigningStargateClient.connectWithSigner(RPC, wallet)
  const res = await client.signAndBroadcast(account.address, msgs as any, fee as any, memo)
  return res
}

export function subscribeWS({ onNewBlock, onTx }:{ onNewBlock?: (h:number)=>void, onTx?: (tx:any)=>void }) {
  const url = WS
  let ws: WebSocket | null = null
  let timer: any = null
  const connect = () => {
    try {
      ws = new WebSocket(url)
      ws.onopen = () => {
        // Tendermint/CometBFT websockets: subscribe to new blocks and txs
        ws?.send(JSON.stringify({ jsonrpc: '2.0', method: 'subscribe', id: '1', params: { query: "tm.event='NewBlock'" } }))
        ws?.send(JSON.stringify({ jsonrpc: '2.0', method: 'subscribe', id: '2', params: { query: "tm.event='Tx'" } }))
      }
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          // New block event
          const type = data?.result?.data?.type || data?.result?.events?.['tm.event']?.[0]
          if (type && String(type).includes('NewBlock')) {
            const h = Number(data?.result?.data?.value?.block?.header?.height || 0)
            if (h && onNewBlock) onNewBlock(h)
          }
          // Tx event (pass-through)
          if (data?.result && (data?.result?.events || data?.result?.data?.type === 'tendermint/event/Tx')) {
            onTx?.(data.result)
          }
        } catch {}
      }
      ws.onclose = () => { schedule() }
      ws.onerror = () => { try { ws?.close() } catch {}; schedule() }
    } catch { schedule() }
  }
  const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(connect, 1500) }
  connect()
  return () => { if (timer) clearTimeout(timer); try { ws?.close() } catch {} }
}
