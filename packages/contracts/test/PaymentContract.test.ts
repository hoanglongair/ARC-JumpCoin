import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentContract", function () {
  async function deployFixture() {
    const [owner, player, treasury, otherTreasury] = await ethers.getSigners();
    const playFee = ethers.parseEther("10");

    const MockArcToken = await ethers.getContractFactory("MockArcToken");
    const token = await MockArcToken.deploy();

    const PaymentContract = await ethers.getContractFactory("PaymentContract");
    const payment = await PaymentContract.deploy(
      await token.getAddress(),
      treasury.address,
      playFee,
      owner.address
    );

    await token.mint(player.address, ethers.parseEther("100"));

    return { owner, player, treasury, otherTreasury, playFee, token, payment };
  }

  it("transfers the fixed play fee to treasury and emits an event", async function () {
    const { player, treasury, playFee, token, payment } = await deployFixture();

    await token.connect(player).approve(await payment.getAddress(), playFee);

    await expect(payment.connect(player).pay())
      .to.emit(payment, "PaymentReceived")
      .withArgs(player.address, playFee);

    expect(await token.balanceOf(treasury.address)).to.equal(playFee);
  });

  it("reverts without allowance", async function () {
    const { player, payment } = await deployFixture();

    await expect(payment.connect(player).pay()).to.be.reverted;
  });

  it("allows owner to update treasury and fee", async function () {
    const { owner, otherTreasury, payment } = await deployFixture();
    const newFee = ethers.parseEther("12");

    await expect(payment.connect(owner).setTreasury(otherTreasury.address))
      .to.emit(payment, "TreasuryUpdated");
    await expect(payment.connect(owner).setPlayFee(newFee))
      .to.emit(payment, "PlayFeeUpdated");

    expect(await payment.treasury()).to.equal(otherTreasury.address);
    expect(await payment.playFee()).to.equal(newFee);
  });
});
