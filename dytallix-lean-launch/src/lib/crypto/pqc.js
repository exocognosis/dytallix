// Compatibility layer for tests expecting JS-style API surface.
import { generateKeypair as _gen, sign as _sign, verify as _verify, pubkeyFromSecret as _pubFromSec } from '../../crypto/pqc/pqc.ts'

function b64(u8){
  const B = (typeof globalThis !== 'undefined' && globalThis.Buffer) || null
  return B ? Buffer.from(u8).toString('base64') : btoa(String.fromCharCode(...u8))
}
function ub64(s){
  const B = (typeof globalThis !== 'undefined' && globalThis.Buffer) || null
  if (B) return new Uint8Array(Buffer.from(s,'base64'))
  const bin = atob(s)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export async function generateKeypair(algo){
  const kp = await _gen(algo)
  return { algo: kp.algo, publicKey: kp.pk, secretKey: kp.sk }
}

export async function sign(algo, secretKey, msg){
  const u8 = await _sign(algo, secretKey, msg)
  return b64(u8)
}

export async function verify(algo, publicKey, msg, sigB64){
  const sig = ub64(sigB64)
  return _verify(algo, publicKey, msg, sig)
}

export const pubkeyFromSecret = _pubFromSec
