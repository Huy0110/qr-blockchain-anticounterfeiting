/**
 * Network selection. Each experiment chooses an ethers Provider and a
 * signer based on `NETWORK=hardhat|amoy`. The hardhat path assumes
 * `npx hardhat node` is running (or any local 8545 RPC). The amoy
 * path requires real keys + RPC URL in the environment.
 */

import { JsonRpcProvider, NonceManager, Wallet, type Provider, type Signer } from 'ethers';

export type Network = 'hardhat' | 'amoy';

export interface NetworkContext {
  network: Network;
  provider: Provider;
  signer: Signer;
  contractAddress: string;
}

export function resolveNetwork(arg?: string): Network {
  const v = (arg ?? process.env.NETWORK ?? 'hardhat').toLowerCase();
  if (v !== 'hardhat' && v !== 'amoy') {
    throw new Error(`Unsupported NETWORK=${v}. Use 'hardhat' or 'amoy'.`);
  }
  return v;
}

/**
 * Hardhat-default key matches `hardhat node`'s account #0:
 *   private: 0xac0974...80
 *   address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 * Account #0 is also the default deployer for the contracts package.
 */
const HARDHAT_DEFAULT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export async function buildContext(network: Network): Promise<NetworkContext> {
  if (network === 'hardhat') {
    const rpc = process.env.HARDHAT_RPC_URL ?? 'http://127.0.0.1:8545';
    const provider = new JsonRpcProvider(rpc);
    const wallet = new Wallet(process.env.HARDHAT_PRIVATE_KEY ?? HARDHAT_DEFAULT_KEY, provider);
    // NonceManager keeps a local nonce counter so back-to-back txs
    // within a trial don't race against `eth_getTransactionCount("pending")`
    // on a fast-mining anvil. Without it, ethers re-uses a mined nonce
    // and the second tx in a trial fails with NONCE_EXPIRED.
    const signer = new NonceManager(wallet);
    const contractAddress =
      process.env.PRODUCT_REGISTRY_ADDRESS ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    return { network, provider, signer, contractAddress };
  }
  const rpc = process.env.AMOY_RPC_URL;
  const key = process.env.AMOY_PRIVATE_KEY;
  const contractAddress = process.env.PRODUCT_REGISTRY_ADDRESS;
  if (!rpc || !key || !contractAddress) {
    throw new Error(
      'NETWORK=amoy requires AMOY_RPC_URL, AMOY_PRIVATE_KEY, PRODUCT_REGISTRY_ADDRESS env vars.',
    );
  }
  const provider = new JsonRpcProvider(rpc);
  const signer = new NonceManager(new Wallet(key, provider));
  return { network, provider, signer, contractAddress };
}
