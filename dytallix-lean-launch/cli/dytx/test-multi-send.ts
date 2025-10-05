#!/usr/bin/env tsx
// Test script for sending both DRT and DGT in a single transaction

import { DytClient } from './src/lib/client.js'
import { signTx, txHashHex, canonicalJson, type Tx } from './src/lib/tx.js'
import { decryptSecretKey } from './src/keystore.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

const RPC_URL = 'http://localhost:3030'
const FROM_ADDRESS = 'dytallix125074e67f966c5c9a0538381c2398a8966cda568'
const TO_ADDRESS = 'dytallix1test000000000000000000000000000'
const KEYSTORE_NAME = 'testkey'
const PASSPHRASE_FILE = '/tmp/pass'

async function main() {
  console.log('🔄 Creating multi-denomination transaction...')
  
  // Initialize client
  const client = new DytClient(RPC_URL)
  
  // Get account info
  const acct = await client.getAccount(FROM_ADDRESS)
  const nonce = Number(acct.nonce || 0)
  const stats = await client.getStats()
  const chainId = stats.chain_id
  
  console.log(`Chain ID: ${chainId}`)
  console.log(`Current nonce: ${nonce}`)
  
  // Build transaction with TWO messages: one for DGT, one for DRT
  const tx: Tx = {
    chain_id: chainId,
    nonce,
    msgs: [
      {
        type: 'send',
        from: FROM_ADDRESS,
        to: TO_ADDRESS,
        denom: 'DGT',
        amount: '30000000' // 30 DGT
      },
      {
        type: 'send',
        from: FROM_ADDRESS,
        to: TO_ADDRESS,
        denom: 'DRT',
        amount: '20000000' // 20 DRT
      }
    ],
    fee: '1000',
    memo: 'Multi-denom test'
  }
  
  console.log('\n📦 Transaction details:')
  console.log(JSON.stringify(tx, null, 2))
  
  // Load keystore
  const keystorePath = resolve(homedir(), '.dytx', 'keystore', `${KEYSTORE_NAME}.json`)
  const keystoreData = JSON.parse(readFileSync(keystorePath, 'utf8'))
  
  // Decrypt secret key
  const passphrase = readFileSync(PASSPHRASE_FILE, 'utf8').trim()
  const sk = decryptSecretKey(keystoreData, passphrase)
  const pk = Buffer.from(keystoreData.pubkey_b64, 'base64')
  
  console.log('\n🔐 Signing transaction...')
  const signed = signTx(tx, sk, new Uint8Array(pk))
  
  console.log(`✅ Transaction signed`)
  console.log(`Hash: ${txHashHex(tx)}`)
  
  // Submit transaction
  console.log('\n📤 Submitting transaction...')
  const result = await client.submitSignedTx(signed)
  
  console.log('\n✅ Transaction submitted!')
  console.log(`Status: ${result.status}`)
  console.log(`Hash: ${result.hash || txHashHex(tx)}`)
  
  // Wait a bit and check balances
  console.log('\n⏳ Waiting 5 seconds for block confirmation...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('\n💰 Checking balances...')
  const senderBalance = await client.getBalance(FROM_ADDRESS)
  const recipientBalance = await client.getBalance(TO_ADDRESS)
  
  console.log('\nSender balances:')
  console.log(JSON.stringify(senderBalance.balances, null, 2))
  
  console.log('\nRecipient balances:')
  console.log(JSON.stringify(recipientBalance.balances, null, 2))
}

main().catch(console.error)
