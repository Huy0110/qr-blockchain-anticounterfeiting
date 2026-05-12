/**
 * build-abi.ts — extracts the contract ABI from Foundry's build output and
 * writes it into the shared package as a deterministic, committed JSON file.
 *
 *   pnpm --filter @qr-bc/shared build:abi
 *
 * Reads:  ../../contracts/out/ProductRegistry.sol/ProductRegistry.json
 * Writes: ./src/abi/ProductRegistry.json
 *
 * Strips the verbose Foundry artifact down to { contractName, sourceName,
 * abi }. Bytecode + devdoc + ast + methodIdentifiers are not part of the
 * runtime API surface (consumers don't deploy from the shared package; the
 * contracts workspace handles deploys). Keeping the file lean reduces npm
 * pack size and avoids leaking compilation metadata that varies between
 * dev environments.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOUNDRY_ARTIFACT = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'contracts',
  'out',
  'ProductRegistry.sol',
  'ProductRegistry.json',
);
const OUTPUT = resolve(__dirname, '..', 'src', 'abi', 'ProductRegistry.json');

if (!existsSync(FOUNDRY_ARTIFACT)) {
  console.error(`Cannot find ${FOUNDRY_ARTIFACT}. Run 'forge build' inside contracts/ first.`);
  process.exit(1);
}

interface FoundryArtifact {
  abi: unknown[];
  metadata?: { settings?: { compilationTarget?: Record<string, string> } };
}

const raw = readFileSync(FOUNDRY_ARTIFACT, 'utf8');
const artifact: FoundryArtifact = JSON.parse(raw);

if (!Array.isArray(artifact.abi)) {
  console.error('Foundry artifact is missing the abi array.');
  process.exit(1);
}

// Pull contractName + sourceName from metadata.settings.compilationTarget.
// Foundry encodes this as { "<sourceFile>": "<contractName>" }.
const target = artifact.metadata?.settings?.compilationTarget ?? {};
const [sourceName, contractName] = Object.entries(target)[0] ?? [
  'src/ProductRegistry.sol',
  'ProductRegistry',
];

const stripped = {
  contractName,
  sourceName,
  abi: artifact.abi,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
// Stable JSON — sorted top-level keys + trailing newline — so re-runs are
// byte-identical when the contract hasn't changed.
const json = JSON.stringify(stripped, null, 2) + '\n';
writeFileSync(OUTPUT, json);

console.log(`Wrote ABI: ${OUTPUT}`);
console.log(`  contract: ${contractName}`);
console.log(`  source:   ${sourceName}`);
console.log(`  fns/events/errors: ${artifact.abi.length}`);
