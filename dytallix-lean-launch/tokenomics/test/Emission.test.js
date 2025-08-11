const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('EmissionSchedule', function () {
  it('mints tokens on emit', async function () {
    const [owner, user] = await ethers.getSigners()
    const DRT = await ethers.getContractFactory('DRTToken')
    const drt = await DRT.deploy()
    const Emission = await ethers.getContractFactory('EmissionSchedule')
    const emission = await Emission.deploy(await drt.getAddress(), ethers.parseEther('1'))
    await drt.setEmission(await emission.getAddress())
    await emission.emitTokens(user.address)
    expect(await drt.balanceOf(user.address)).to.equal(ethers.parseEther('1'))
  })
})
