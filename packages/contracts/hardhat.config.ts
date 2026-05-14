import "@nomicfoundation/hardhat-toolbox";
import { config } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

config({ path: "../../.env" });
config();

const arcRpcUrl = process.env.ARC_RPC_URL ?? "";
const privateKey = process.env.PRIVATE_KEY ?? "";

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
      accounts: privateKey && !privateKey.endsWith("0000000000000000000000000000000000000000000000000000000000000000")
        ? [privateKey]
        : []
    }
  }
};

export default hardhatConfig;
