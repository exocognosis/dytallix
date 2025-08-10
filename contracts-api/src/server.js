import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { ethers } from 'ethers'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

// Load Hardhat local network by default, fallback to env RPC
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545'
const provider = new ethers.JsonRpcProvider(RPC_URL)

// Load ABIs from hardhat artifacts for templates
const artifactsRoot = path.resolve(__dirname, '../../deployment/ethereum-contracts/artifacts/contracts')

async function loadArtifact(name) {
  const file = path.join(artifactsRoot, name, name.replace('.sol', '.json'))
  const content = await readFile(file, 'utf8')
  return JSON.parse(content)
}

// Preload ABI map
let ABI_CACHE = {}
async function ensureAbis() {
  try {
    ABI_CACHE['WrappedDytallix'] = (await loadArtifact('WrappedDytallix.sol')).abi
    ABI_CACHE['WrappedTokenFactory'] = (await loadArtifact('WrappedTokenFactory.sol')).abi
    ABI_CACHE['DytallixBridge'] = (await loadArtifact('DytallixBridge.sol')).abi
  } catch (e) {
    console.warn('ABI preload failed:', e.message)
  }
}
ensureAbis()

// In-memory registry of deployments (can be replaced by DB)
const deployments = []

// Health
app.get('/health', (req, res) => res.json({ success: true, data: 'ok' }))

// List deployed contracts
app.get('/contracts', (req, res) => {
  res.json({ success: true, data: deployments })
})

// Get a specific deployed contract by address
app.get('/contracts/:address', (req, res) => {
  const address = String(req.params.address).toLowerCase()
  const item = deployments.find(d => d.address.toLowerCase() === address)
  if (!item) return res.status(404).json({ success: false, error: 'Not found' })
  res.json({ success: true, data: item })
})

// Deploy contract templates by id
// body: { templateId: 'erc20-pqc'|'nft-pqc'|'dao-governance'|'defi-pool', args?: any[] }
app.post('/contracts/deploy-template', async (req, res) => {
  try {
    const { templateId, args = [] } = req.body || {}
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId required' })

    // For this iteration, map ERC-20 to WrappedDytallix to provide a real deployable token
    let contractName
    let constructorArgs

    if (templateId === 'erc20-pqc') {
      contractName = 'WrappedDytallix'
      const [name='DytalToken', symbol='DYT', adminAddress, bridgeAddress, originalChain='dytallix', originalAsset='0x0000000000000000000000000000000000000000'] = args

      // Use first local account as admin when not provided
      const signer = await provider.getSigner(0)
      const admin = adminAddress || await signer.getAddress()
      const bridge = bridgeAddress || await signer.getAddress()
      constructorArgs = [name, symbol, admin, bridge, originalChain, originalAsset]

      const artifact = (await loadArtifact('WrappedDytallix.sol'))
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
      const contract = await factory.deploy(...constructorArgs)
      await contract.waitForDeployment()
      const address = await contract.getAddress()

      const deployment = {
        address,
        name: name,
        templateId,
        network: RPC_URL,
        abi: artifact.abi,
        creator: admin,
        created_at: Date.now(),
        code_hash: ethers.keccak256(artifact.bytecode)
      }
      deployments.push(deployment)

      return res.json({ success: true, data: deployment })
    } else {
      return res.status(400).json({ success: false, error: 'Template not yet implemented' })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// Generic deploy route to match existing frontend api.deployContract(code, abi)
// For now just creates a dummy registry entry since arbitrary code deploy is not allowed here
app.post('/contracts/deploy', async (req, res) => {
  const { code, abi } = req.body || {}
  const address = ethers.Wallet.createRandom().address
  const signer = await provider.getSigner(0)
  const creator = await signer.getAddress()
  const item = { 
    address, 
    name: 'CustomContract', 
    templateId: 'custom', 
    network: RPC_URL, 
    abi: abi || [],
    creator,
    created_at: Date.now(),
    code_hash: code ? ethers.keccak256(ethers.toUtf8Bytes(code)) : undefined
  }
  deployments.push(item)
  res.json({ success: true, data: item })
})

// Call contract function (read-only or state changing)
app.post('/contracts/call', async (req, res) => {
  try {
    const { contract_address, function_name, parameters = [], gas_limit } = req.body || {}
    const contractMeta = deployments.find(d => d.address.toLowerCase() === String(contract_address).toLowerCase())
    if (!contractMeta) return res.status(404).json({ success: false, error: 'Unknown contract' })

    const signer = await provider.getSigner(0)
    const contract = new ethers.Contract(contractMeta.address, contractMeta.abi, signer)

    const fn = contract[function_name]
    if (!fn) return res.status(400).json({ success: false, error: 'Function not found in ABI' })

    const txOverrides = {}
    if (gas_limit) txOverrides['gasLimit'] = BigInt(gas_limit)

    const result = await fn(...parameters, txOverrides)
    // Try to normalize BigInt/BigNumber results
    const normalized = typeof result === 'bigint' ? result.toString() : result

    res.json({ success: true, data: normalized })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = process.env.PORT || 3030
app.listen(port, () => {
  console.log(`Contracts API listening on http://localhost:${port}`)
})
