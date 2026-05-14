import { ethers } from "hardhat";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const tokenAddress = requiredEnv("TOKEN_ADDRESS");
  const treasuryAddress = requiredEnv("TREASURY_ADDRESS");
  const playFee = requiredEnv("PLAY_FEE");
  const [deployer] = await ethers.getSigners();

  const PaymentContract = await ethers.getContractFactory("PaymentContract");
  const paymentContract = await PaymentContract.deploy(
    tokenAddress,
    treasuryAddress,
    playFee,
    deployer.address
  );

  await paymentContract.waitForDeployment();

  console.log("PaymentContract deployed to:", await paymentContract.getAddress());
  console.log("Owner:", deployer.address);
  console.log("Token:", tokenAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("Play fee:", playFee);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
