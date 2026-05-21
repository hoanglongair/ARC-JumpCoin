import "@nomicfoundation/hardhat-toolbox";
import { config } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

config({ path: "../../.env" });
config();

const arcRpcUrl = process.env.ARC_RPC_URL ?? "";
const privateKey = process.env.PRIVATE_KEY ?? "";
const privateKeyPattern = /^0x[a-fA-F0-9]{64}$/;

const hardhatConfig: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arcTestnet: {
      url: arcRpcUrl,
      accounts: privateKeyPattern.test(privateKey) ? [privateKey] : []
    }
  }
};

export default hardhatConfig;
