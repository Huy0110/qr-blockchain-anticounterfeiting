import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import hre from 'hardhat';

/**
 * Hardhat alt-path deploy script for ProductRegistry. Run with:
 *   pnpm --filter @qr-bc/contracts exec hardhat run deploy/01_deploy_product_registry.ts --network hardhat
 *
 * Writes the deployed address to contracts/out/address.<network>.json with
 * the same shape as the Foundry Deploy.s.sol script so the Coordination Hub
 * can read either output transparently.
 */
async function main(): Promise<void> {
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  const ProductRegistryFactory = await hre.ethers.getContractFactory('ProductRegistry');
  const registry = await ProductRegistryFactory.deploy();
  await registry.waitForDeployment();
  const deployedAddress = await registry.getAddress();

  const networkLabel = networkLabelFromChainId(Number(chainId));
  const outFile = join(__dirname, '..', 'out', `address.${networkLabel}.json`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        contractAddress: deployedAddress,
        chainId: Number(chainId),
        network: networkLabel,
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`ProductRegistry deployed via Hardhat (network=${network}): ${deployedAddress}`);
  console.log(`Address written to: ${outFile}`);
}

function networkLabelFromChainId(chainId: number): string {
  if (chainId === 31337) return 'local';
  if (chainId === 80002) return 'amoy';
  if (chainId === 137) return 'mainnet';
  return 'unknown';
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
