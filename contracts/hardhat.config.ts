import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    injective: {
      url: process.env.INJECTIVE_RPC || "https://sentry.tm.injective.network:443",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 88888
    },
    injective_testnet: {
      url: "https://testnet.sentry.tm.injective.network:443",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 88888
    }
  },
  etherscan: {
    apiKey: {
      injective: process.env.ETHERSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "injective",
        chainId: 88888,
        urls: {
          apiURL: "https://explorer.injective.network/api",
          browserURL: "https://explorer.injective.network"
        }
      }
    ]
  }
};

export default config;