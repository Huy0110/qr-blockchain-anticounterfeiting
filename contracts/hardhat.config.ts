import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-foundry';
import * as dotenv from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';

dotenv.config();

const RPC_URL_AMOY = process.env.RPC_URL_AMOY ?? 'https://rpc-amoy.polygon.technology';
const RPC_URL_MAINNET = process.env.RPC_URL_MAINNET ?? 'https://polygon-rpc.com';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      metadata: { bytecodeHash: 'none' },
    },
  },
  paths: {
    sources: 'src',
    tests: 'test/hardhat',
    cache: 'cache',
    artifacts: 'artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // External chain — used by the docker-compose contracts-deployer
    // service (HARDHAT_RPC_URL=http://hardhat:8545) and any host-side
    // `hardhat run --network localhost`.
    localhost: {
      url: process.env.HARDHAT_RPC_URL ?? 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    amoy: {
      url: RPC_URL_AMOY,
      chainId: 80002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    mainnet: {
      url: RPC_URL_MAINNET,
      chainId: 137,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: ETHERSCAN_API_KEY,
      polygon: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
    ],
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
