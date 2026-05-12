import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Standalone helper that converts a Foundry broadcast log (or a Hardhat
 * deployment receipt) into the canonical out/address.<network>.json file
 * the Coordination Hub reads at startup.
 *
 * Usage:
 *   pnpm --filter @qr-bc/contracts exec ts-node scripts/write-address.ts \
 *     <network> <contractAddress>
 *
 * Most production paths bypass this script — Deploy.s.sol writes the file
 * directly via vm.writeFile, and the Hardhat alt-path does the same in JS.
 * This helper exists so contributors can repair the address file by hand
 * after a manual deploy without re-running the full pipeline.
 */
const [, , networkArg, addressArg] = process.argv;

if (!networkArg || !addressArg) {
  console.error('usage: write-address.ts <network> <contractAddress>');
  process.exit(2);
}

const chainIdMap: Record<string, number> = {
  local: 31337,
  amoy: 80002,
  mainnet: 137,
};
const chainId = chainIdMap[networkArg] ?? 0;
const outFile = join(__dirname, '..', 'out', `address.${networkArg}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify({ contractAddress: addressArg, chainId, network: networkArg }, null, 2) + '\n',
);
console.log(`Wrote ${outFile}`);

// Sanity-read so a malformed JSON is caught immediately.
JSON.parse(readFileSync(outFile, 'utf8'));
