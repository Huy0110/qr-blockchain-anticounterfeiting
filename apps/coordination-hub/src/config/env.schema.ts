import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

/**
 * Path the contracts-deployer compose service writes the freshly
 * deployed ProductRegistry address to. The hub mounts the same
 * volume read-only at this location.
 */
export const DEFAULT_CONTRACT_ADDRESS_FILE = '/contracts-out/address.txt';

/**
 * If `CONTRACT_ADDRESS` is not set in the environment but the file
 * dropped by the deployer exists, read it. AC-DO-7: the hub consumes
 * the deployer's output without manual intervention. Path is a
 * parameter so tests can inject a temp dir.
 */
export function readContractAddressFile(path: string): string | undefined {
  try {
    if (!existsSync(path)) return undefined;
    const raw = readFileSync(path, 'utf8').trim();
    return raw.length > 0 ? raw : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Environment-variable schema for the Coordination Hub.
 *
 * Mirrors apps/coordination-hub/.env.example. The schema is the source of
 * truth: anything missing here that's referenced in code will surface at
 * boot time, not in production. Defaults reflect docker-compose's default
 * profile so `pnpm start:dev` "just works" for a freshly cloned repo.
 *
 * Bootstrap calls `EnvSchema.parse(process.env)`; any failure crashes the
 * process before NestJS has a chance to start, with a Zod error message
 * listing every missing/invalid field at once.
 */
const booleanish = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => v === true || v === 'true');

export const EnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  EXPOSE_SWAGGER: booleanish.default(true),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3001,http://localhost:3002')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  // Auth — required at runtime, optional in test so unit tests can mock.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars').optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_SECRET: z.string().min(32).optional(),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Wallet encryption (32 raw bytes encoded as base64 = 44 chars).
  WALLET_ENCRYPTION_KEK: z
    .string()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'must be base64')
    .optional(),

  // Database
  MONGO_URI: z.string().default('mongodb://localhost:27017/qr_bc'),

  // Blockchain
  NETWORK: z.enum(['hardhat', 'amoy', 'mainnet']).default('hardhat'),
  RPC_URL: z.string().url().default('http://localhost:8545'),
  CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'must be 0x-prefixed 20-byte hex')
    .optional(),
  SYSTEM_WALLET_PRIVATE_KEY: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, 'must be 32-byte hex')
    .optional(),
  TX_CONFIRMATIONS: z.coerce.number().int().nonnegative().default(1),
  TX_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),

  // IPFS
  IPFS_PROVIDER: z.enum(['local', 'pinata', 'mock']).default('local'),
  IPFS_API_URL: z.string().url().default('http://localhost:5001'),
  IPFS_GATEWAY_URL: z.string().url().default('http://localhost:8080'),
  PINATA_JWT: z.string().optional(),

  // Rate limits
  RATE_LIMIT_LOGIN_PER_15M: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REGISTER_PER_HOUR: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_SCAN_PRIVATE_PER_MIN: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_AUTH_GENERIC_PER_MIN: z.coerce.number().int().positive().default(600),

  // Misc
  DAILY_SALT_ROTATE_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(0),
  /** Long-lived secret used to salt the IP-hash in verificationLogs.
   *  Combined with the rotating-day component so the per-day hash is
   *  non-recoverable even with full DB access. Recommend 32 random bytes
   *  base64-encoded. Optional in dev; required in production. */
  DAILY_SALT_SECRET: z.string().min(16).optional(),
  LOG_PUBLIC_SCANS: booleanish.default(true),
});

export type Env = z.infer<typeof EnvSchema>;

export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError' as const;
  constructor(public readonly issues: z.ZodIssue[]) {
    super(
      'Environment validation failed:\n' +
        issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'),
    );
  }
}

export interface LoadEnvOptions {
  /** Override the address-file path. Defaults to /contracts-out/address.txt
   *  so production never has to think about it; tests inject a temp path. */
  contractAddressFile?: string;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env, opts: LoadEnvOptions = {}): Env {
  // AC-DO-7: when CONTRACT_ADDRESS is unset (or empty — docker-compose's
  // `${CONTRACT_ADDRESS:-}` substitutes ""), fall back to the file
  // the contracts-deployer writes after a fresh hardhat deploy.
  // Lets `make demo` work end-to-end without the operator copy-pasting
  // the deployed address.
  const merged: NodeJS.ProcessEnv = { ...source };
  if (!merged.CONTRACT_ADDRESS || merged.CONTRACT_ADDRESS.trim() === '') {
    delete merged.CONTRACT_ADDRESS;
    const fromFile = readContractAddressFile(
      opts.contractAddressFile ?? DEFAULT_CONTRACT_ADDRESS_FILE,
    );
    if (fromFile) merged.CONTRACT_ADDRESS = fromFile;
  }
  const parsed = EnvSchema.safeParse(merged);
  if (!parsed.success) {
    throw new EnvValidationError(parsed.error.issues);
  }
  return parsed.data;
}
