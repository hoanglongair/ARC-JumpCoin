import { ethers } from "hardhat";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const paymentContractAddress = requiredEnv("NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS");
  const playFee = requiredEnv("PLAY_FEE");
  const [signer] = await ethers.getSigners();

  if (!signer) {
    throw new Error(
      "No signer found. Check PRIVATE_KEY in root .env. It must be the current PaymentContract owner private key in 0x + 64 hex characters format."
    );
  }

  const paymentContract = await ethers.getContractAt("PaymentContract", paymentContractAddress);
  const [currentPlayFee, owner] = await Promise.all([
    paymentContract.playFee(),
    paymentContract.owner()
  ]);

  console.log("PaymentContract:", paymentContractAddress);
  console.log("Signer:", signer.address);
  console.log("Owner:", owner);
  console.log("Current playFee:", currentPlayFee.toString());
  console.log("Target playFee:", playFee);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      "PRIVATE_KEY does not belong to the PaymentContract owner. Use the deployer/owner private key, or deploy a new PaymentContract with the current PRIVATE_KEY."
    );
  }

  if (currentPlayFee === BigInt(playFee)) {
    console.log("PaymentContract playFee is already set to:", playFee);
    return;
  }

  await paymentContract.setPlayFee.staticCall(playFee);

  const tx = await paymentContract.setPlayFee(playFee);
  console.log("Updating playFee from", currentPlayFee.toString(), "to", playFee);
  console.log("Transaction:", tx.hash);

  await tx.wait();
  console.log("PaymentContract playFee updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
