#!/usr/bin/env tsx
/**
 * i18n-key-parity.ts — enforce that every leaf key in every
 * `apps/<app>/messages/<locale>.json` exists in every other locale
 * file of the same app. CI calls this; missing keys fail the build.
 *
 * Usage:
 *   pnpm dlx tsx scripts/i18n-key-parity.ts
 *
 * Exit codes:
 *   0  all locales in parity across every app
 *   1  at least one key drift detected (printed in the report)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APPS_DIR = resolve(SCRIPT_DIR, '..', 'apps');

function walkLeaves(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    walkLeaves(v, prefix === '' ? k : `${prefix}.${k}`),
  );
}

interface AppParityResult {
  app: string;
  locales: string[];
  missing: { locale: string; key: string }[];
}

function checkApp(appDir: string, appName: string): AppParityResult {
  const messagesDir = join(appDir, 'messages');
  let entries: string[];
  try {
    entries = readdirSync(messagesDir);
  } catch {
    return { app: appName, locales: [], missing: [] };
  }
  const locales = entries.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

  const keysByLocale = new Map<string, Set<string>>();
  for (const locale of locales) {
    const raw = readFileSync(join(messagesDir, `${locale}.json`), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    keysByLocale.set(locale, new Set(walkLeaves(parsed)));
  }

  const union = new Set<string>();
  for (const set of keysByLocale.values()) {
    for (const k of set) union.add(k);
  }

  const missing: { locale: string; key: string }[] = [];
  for (const [locale, set] of keysByLocale) {
    for (const k of union) {
      if (!set.has(k)) missing.push({ locale, key: k });
    }
  }

  missing.sort((a, b) => a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key));

  return { app: appName, locales, missing };
}

function main(): void {
  const apps = readdirSync(APPS_DIR).filter((f) => {
    try {
      return statSync(join(APPS_DIR, f)).isDirectory();
    } catch {
      return false;
    }
  });

  const results = apps
    .map((app) => checkApp(join(APPS_DIR, app), app))
    .filter((r) => r.locales.length >= 2);

  let totalMissing = 0;
  for (const r of results) {
    if (r.missing.length === 0) {
      console.log(
        `[OK]   apps/${r.app}: ${r.locales.length} locale(s) in parity (${r.locales.join(', ')})`,
      );
      continue;
    }
    totalMissing += r.missing.length;
    console.error(
      `[FAIL] apps/${r.app}: ${r.missing.length} key drift(s) across ${r.locales.join(', ')}`,
    );
    for (const m of r.missing) {
      console.error(`         missing in ${m.locale}: ${m.key}`);
    }
  }

  if (totalMissing > 0) {
    console.error(`\n${totalMissing} key drift(s) detected. Fix before merging.`);
    process.exit(1);
  }
}

main();
