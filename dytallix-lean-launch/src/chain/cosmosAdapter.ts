// CosmJS adapter for balances, tx build/sign/broadcast, and WS subscribe
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient, StargateClient } from '@cosmjs/stargate'

const LCD = import.meta.env.VITE_LCD_HTTP_URL
const RPC = import.meta.env.VITE_RPC_HTTP_URL
const WS = import.meta.env.VITE_RPC_WS_URL
const CHAIN_ID = String(import.meta.env.VITE_CHAIN_ID) // ensure string

export async function getBalances(addr: string) {
  const url = `${LCD}/cosmos/bank/v1beta1/balances/${addr}`
  const r = await fetch(url)
  if (!r.ok) throw new Error('LCD error')
  const j = await r.json()
  return j
}

export async function buildAndBroadcastTx({ fromMnemonic, msgs, fee, memo }:{ fromMnemonic: string, msgs: any[], fee: any, memo?: string }) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(fromMnemonic)
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
        // tendermint websockets: subscribe to new blocks and txs
        ws?.send(JSON.stringify({ jsonrpc: '2.0', method: 'subscribe', id: '1', params: { query: "tm.event='NewBlock'" } }))
      }
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.result?.data?.type === 'tendermint/event/NewBlock') {
            const h = Number(data?.result?.data?.value?.block?.header?.height || 0)
            if (h && onNewBlock) onNewBlock(h)
          }
          if (data?.result?.events?.['tx.hash']) {
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
