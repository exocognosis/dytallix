import { createHash } from 'crypto'
import { DILITHIUM_ALGO, signDilithium } from './pqc.js'

export type Msg = { type: 'send'; from: string; to: string; denom: 'DGT' | 'DRT'; amount: string }

export interface Tx {
  chain_id: string
  nonce: number
  msgs: Msg[]
  fee: string
  memo: string
}

export function buildSendTx(
  chainId: string,
  nonce: number,
  from: string,
  to: string,
  denom: 'DGT' | 'DRT',
  amountMicro: string,
  memo = '',
  fee: string | undefined = '1000'
): Tx {
  return {
    chain_id: chainId,
    nonce,
    msgs: [{ type: 'send', from, to, denom, amount: amountMicro }],
    fee: fee ?? '1000',
    memo
  }
}

export function canonicalJson(obj: unknown): Uint8Array {
  const stable = (value: any): any => {
    if (Array.isArray(value)) return value.map(stable)
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = stable(value[key])
          return acc
        }, {})
    }
    return value
  }
  const str = JSON.stringify(stable(obj))
  return new TextEncoder().encode(str)
}

export function txHashHex(tx: Tx): string {
  const canonical = canonicalJson({
    chain_id: tx.chain_id,
    fee: tx.fee,
    memo: tx.memo,
    msgs: tx.msgs,
    nonce: tx.nonce
  })
  const digest = createHash('sha3-256').update(Buffer.from(canonical)).digest('hex')
  return `0x${digest}`
}

export function signTx(tx: Tx, secretKey: Uint8Array, publicKey: Uint8Array) {
  if (publicKey.byteLength === 0) {
    throw new Error('Public key is required for signing output')
  }
  const signBytes = canonicalJson({
    chain_id: tx.chain_id,
    fee: tx.fee,
    memo: tx.memo,
    msgs: tx.msgs,
    nonce: tx.nonce
  })
  const signature = signDilithium(secretKey, signBytes)
  return {
    tx: {
      chain_id: tx.chain_id,
      nonce: tx.nonce,
      msgs: tx.msgs.map(msg => ({
        type: msg.type,
        from: msg.from,
        to: msg.to,
        denom: msg.denom,
        amount: msg.amount
      })),
      fee: tx.fee,
      memo: tx.memo
    },
    public_key: Buffer.from(publicKey).toString('base64'),
    signature: Buffer.from(signature).toString('base64'),
    algorithm: DILITHIUM_ALGO,
    version: 1
  }
}
