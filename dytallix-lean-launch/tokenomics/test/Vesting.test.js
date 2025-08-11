const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VestingSchedule', function () {
  it('releases tokens after cliff', async function () {
    const [owner, user] = await ethers.getSigners()
    const DGT = await ethers.getContractFactory('DGTToken')
    const dgt = await DGT.deploy()
    const Vest = await ethers.getContractFactory('VestingSchedule')
    const vest = await Vest.deploy(await dgt.getAddress())
    await dgt.transfer(await vest.getAddress(), ethers.parseEther('100'))
    const now = (await ethers.provider.getBlock('latest')).timestamp
    await vest.addGrant(user.address, ethers.parseEther('100'), now, now + 10, 100)
    await ethers.provider.send('evm_increaseTime', [20])
    await vest.connect(user).release()
    expect(await dgt.balanceOf(user.address)).to.equal(ethers.parseEther('20'))
  })
})
