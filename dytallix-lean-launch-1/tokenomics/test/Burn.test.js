const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('BurnManager', function () {
  it('burns tokens from user', async function () {
    const [owner, user] = await ethers.getSigners()
    const DRT = await ethers.getContractFactory('DRTToken')
    const drt = await DRT.deploy()
    const Burn = await ethers.getContractFactory('BurnManager')
    const burn = await Burn.deploy(await drt.getAddress())
    await drt.mint(user.address, ethers.parseEther('10'))
    await drt.connect(user).approve(await burn.getAddress(), ethers.parseEther('5'))
    await burn.burn(user.address, ethers.parseEther('5'))
    expect(await drt.balanceOf(user.address)).to.equal(ethers.parseEther('5'))
  })
})
