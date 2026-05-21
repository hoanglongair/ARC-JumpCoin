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

  if (!deployer) {
    throw new Error(
      "No deployer signer found. Check PRIVATE_KEY in root .env. It must be the deployer wallet private key in 0x + 64 hex characters format, and must not be the placeholder from .env.example."
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer:", deployer.address);
  console.log("Deployer gas balance:", ethers.formatEther(balance), "USDC");

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 gas balance on Arc Testnet. Fund this address with Arc Testnet USDC from https://faucet.circle.com, then run deploy again."
    );
  }

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
