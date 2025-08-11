import pkg from 'hardhat'
import fs from 'fs'
import path from 'path'

const { ethers } = pkg

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying with:', deployer.address)

  const DGT = await ethers.getContractFactory('DGTToken')
  const dgt = await DGT.deploy()
  await dgt.waitForDeployment()
  const dgtAddr = await dgt.getAddress()
  console.log('DGT deployed at:', dgtAddr)

  const DRT = await ethers.getContractFactory('DRTToken')
  const drt = await DRT.deploy()
  await drt.waitForDeployment()
  const drtAddr = await drt.getAddress()
  console.log('DRT deployed at:', drtAddr)

  // Mint some DRT to deployer so faucet can transfer
  const mintAmount = await (async () => {
    // DRT has 18 decimals per contract
    return ethers.parseUnits('1000000', 18)
  })()
  const mintTx = await drt.mint(deployer.address, mintAmount)
  await mintTx.wait()
  console.log('Minted DRT to deployer:', mintAmount.toString())

  // Update .env with token addresses
  const envPath = path.resolve(process.cwd(), '.env')
  let env = ''
  try { env = fs.readFileSync(envPath, 'utf-8') } catch {}

  const setLine = (text, key, value) => {
    const re = new RegExp(`^${key}=.*$`, 'm')
    if (re.test(text)) return text.replace(re, `${key}=${value}`)
    return (text.endsWith('\n') ? text : text + '\n') + `${key}=${value}\n`
  }

  let updated = setLine(env, 'DGT_TOKEN_ADDRESS', dgtAddr)
  updated = setLine(updated, 'DRT_TOKEN_ADDRESS', drtAddr)
  fs.writeFileSync(envPath, updated)
  console.log('Updated .env with token addresses')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
