import { toB64, sign as mockSign, ALG as MOCK_ALG } from './pqcMock.js'

export type Msg = { type: 'send', from: string, to: string, denom: 'DGT'|'DRT', amount: string }

export interface Tx {
  chain_id: string
  nonce: number
  msgs: Array<{ type: 'send', from: string, to: string, denom: string, amount: string }>
  fee: string
  memo: string
}

export function buildSendTx(chainId: string, nonce: number, from: string, to: string, denom: 'DGT'|'DRT', amountMicro: string, memo=''): Tx {
  return {
    chain_id: chainId,
    nonce,
    msgs: [{ type: 'send', from, to, denom, amount: amountMicro }],
    fee: '1000',
    memo
  }
}

export function canonicalJson(obj: any): Uint8Array {
  // Stable stringify: sort object keys; arrays keep order
  const stable = (v: any): any => {
    if (Array.isArray(v)) return v.map(stable)
    if (v && typeof v === 'object') {
      return Object.keys(v).sort().reduce((acc: any, k) => { acc[k] = stable(v[k]); return acc }, {})
    }
    return v
  }
  const s = JSON.stringify(stable(obj))
  return new TextEncoder().encode(s)
}

export function signTxMock(tx: Tx, sk: Uint8Array, pk: Uint8Array) {
  const bytes = canonicalJson({
    chain_id: tx.chain_id,
    fee: tx.fee,
    memo: tx.memo,
    msgs: tx.msgs,
    nonce: tx.nonce
  })
  const sig = mockSign(sk, bytes)
  return {
    tx: {
      chain_id: tx.chain_id,
      nonce: tx.nonce,
      msgs: tx.msgs.map(m => ({
        type: 'send', from: m.from, to: m.to, denom: m.denom, amount: m.amount
      })),
      fee: tx.fee,
      memo: tx.memo
    },
    public_key: toB64(pk),
    signature: toB64(sig),
    algorithm: MOCK_ALG,
    version: 1
  }
}

