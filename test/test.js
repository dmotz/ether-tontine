/* global describe it */

const chai = require('chai')
const {ethers} = require('hardhat')
const chaiAsPromised = require('chai-as-promised')
const {expect} = chai

chai.use(chaiAsPromised)

const mkTontine = async (dues, interval, minPlayers, allowLatecomers) => {
  const Tontine = await ethers.getContractFactory('Tontine')
  const tontine = await Tontine.deploy(
    dues,
    interval,
    minPlayers,
    allowLatecomers
  )
  await tontine.deployed()
  return tontine
}

const timeTravel = async s => {
  await ethers.provider.send('evm_increaseTime', [s])
  await ethers.provider.send('evm_mine')
}

const defaultDues = 1000
const month = 60 * 60 * 24 * 30

describe('Tontine', () => {
  it('should deploy correctly and return correct config vars', async () => {
    const interval = month
    const minPlayers = 3
    const allowLatecomers = false
    const tontine = await mkTontine(
      defaultDues,
      interval,
      minPlayers,
      allowLatecomers
    )

    expect(await tontine.dues()).to.equal(defaultDues)
    expect(await tontine.interval()).to.equal(interval)
    expect(await tontine.minPlayers()).to.equal(minPlayers)
    expect(await tontine.allowLatecomers()).to.equal(allowLatecomers)
  })

  it('should fail to deploy if minPlayers is less than 2', () =>
    expect(mkTontine(defaultDues, month, 1, false)).to.eventually.be.rejected)

  it('change state when minPlayers is reached', async () => {
    const signers = await ethers.getSigners()
    const tontine = await mkTontine(defaultDues, month, 2, false)

    expect(await tontine.state()).to.equal(0)
    await (await tontine.contribute({value: defaultDues})).wait()
    expect(await tontine.state()).to.equal(0)
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    expect(await tontine.state()).to.equal(1)
  })

  it('should accept only the exact dues', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, false)
    await expect(tontine.contribute({value: defaultDues - 1})).to.eventually.be
      .rejected
    await expect(tontine.contribute({value: defaultDues + 1})).to.eventually.be
      .rejected
    await expect(tontine.contribute({value: defaultDues})).to.eventually.be
      .fulfilled
  })

  it('should disallow contributing more than once before it begins', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, false)
    await (await tontine.contribute({value: defaultDues})).wait()
    await expect(tontine.contribute({value: defaultDues})).to.be.rejected
  })

  it('should disallow latecomers if allowLatecomers is false', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, false)
    const signers = await ethers.getSigners()
    await (await tontine.contribute({value: defaultDues})).wait()
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    await expect(tontine.connect(signers[2]).contribute({value: defaultDues}))
      .to.eventually.be.rejected
  })

  it('should allow latecomers if allowLatecomers is true', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, true)
    const signers = await ethers.getSigners()
    await (await tontine.contribute({value: defaultDues})).wait()
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    await expect(tontine.connect(signers[2]).contribute({value: defaultDues}))
      .to.eventually.be.fulfilled
  })

  it('should allow a player to claim funds when others have been eliminated', async () => {
    const players = 2
    const tontine = await mkTontine(defaultDues, month, players, false)
    const signers = await ethers.getSigners()
    const totalFunds = defaultDues * players

    await (await tontine.contribute({value: defaultDues})).wait()
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    await timeTravel(month * 2)
    expect(await ethers.provider.getBalance(tontine.address)).to.equal(
      totalFunds
    )
    const tx = tontine.claim()
    await (await tx).wait()
    expect(() => tx).to.changeEtherBalance(signers[0], totalFunds)
    expect(await ethers.provider.getBalance(tontine.address)).to.equal(0)
    expect(await ethers.provider.getCode(tontine.address)).to.equal('0x')
  })

  it('should disallow a player to claim funds when others have not been eliminated', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, false)
    const signers = await ethers.getSigners()
    await (await tontine.contribute({value: defaultDues})).wait()
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    await expect(tontine.claim()).to.eventually.be.rejected
  })

  it('should disallow a player to claim funds when the player has not contributed', async () => {
    const tontine = await mkTontine(defaultDues, month, 2, false)
    const signers = await ethers.getSigners()
    await (await tontine.contribute({value: defaultDues})).wait()
    await (
      await tontine.connect(signers[1]).contribute({value: defaultDues})
    ).wait()
    await expect(tontine.connect(signers[2]).claim()).to.eventually.be.rejected
  })
})
