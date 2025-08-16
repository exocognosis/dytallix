// Demo: fetch balances and print latest height via HTTP
const LCD = process.env.VITE_LCD_HTTP_URL || 'http://localhost:1317'
const RPC = process.env.VITE_RPC_HTTP_URL || 'http://localhost:26657'

const addr = process.argv[2] || 'dyt1demoaddress'

async function getBalances(address){
  const r = await fetch(`${LCD}/cosmos/bank/v1beta1/balances/${address}`)
  if (!r.ok) throw new Error(`LCD error ${r.status}`)
  return r.json()
}

async function getHeight(){
  const r = await fetch(`${RPC}/status`)
  if (!r.ok) throw new Error(`RPC error ${r.status}`)
  const j = await r.json()
  return Number(j?.result?.sync_info?.latest_block_height || 0)
}

async function main(){
  try {
    const res = await getBalances(addr)
    console.log('[demo] balances:', JSON.stringify(res))
  } catch (e) {
    console.error('[demo] balance error:', e?.message)
  }
  try {
    const h = await getHeight()
    console.log('[demo] current height:', h)
  } catch (e) {
    console.error('[demo] height error:', e?.message)
  }
}

main()
