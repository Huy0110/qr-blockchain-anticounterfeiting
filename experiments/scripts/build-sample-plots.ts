#!/usr/bin/env tsx
/**
 * One-off generator: reads the committed sample summary.json files
 * under `results/example-RUN_ID/` and produces plot.png alongside
 * each so reviewers can preview the visual artifact without running
 * a full experiment (AC-EX-13).
 *
 * Run via `pnpm tsx scripts/build-sample-plots.ts`. The PNGs are
 * deterministic given the input JSON, so committing them to source
 * is fine.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeBarPlot, writeBoxPlot } from '../lib/plot.ts';

const exampleDir = join(process.cwd(), 'results', 'example-RUN_ID');

async function buildPerfRegistrationPlot(): Promise<void> {
  const path = join(exampleDir, 'perf-registration', 'summary.json');
  const j = JSON.parse(readFileSync(path, 'utf8')) as {
    splits: {
      genHashMs: { min: number; mean: number; max: number };
      submitMs: { min: number; mean: number; max: number };
      confirmMs: { min: number; mean: number; max: number };
    };
    summary: { min: number; mean: number; max: number };
  };
  await writeBoxPlot(join(exampleDir, 'perf-registration', 'plot.png'), {
    title: 'perf-registration (n=30, amoy) — sample',
    yLabel: 'ms',
    buckets: [
      {
        label: 'gen+hash',
        values: [j.splits.genHashMs.min, j.splits.genHashMs.mean, j.splits.genHashMs.max],
      },
      {
        label: 'submit',
        values: [j.splits.submitMs.min, j.splits.submitMs.mean, j.splits.submitMs.max],
      },
      {
        label: 'confirm',
        values: [j.splits.confirmMs.min, j.splits.confirmMs.mean, j.splits.confirmMs.max],
      },
      { label: 'total', values: [j.summary.min, j.summary.mean, j.summary.max] },
    ],
  });
  // eslint-disable-next-line no-console
  console.log(`wrote ${join(exampleDir, 'perf-registration', 'plot.png')}`);
}

async function buildCostAnalysisPlot(): Promise<void> {
  const path = join(exampleDir, 'cost-analysis', 'summary.json');
  const j = JSON.parse(readFileSync(path, 'utf8')) as {
    perOp: {
      registerProject: { usdCost: { mean: number } };
      registerBatch: { usdCost: { mean: number } };
      redeemProduct: { usdCost: { mean: number } };
    };
  };
  await writeBarPlot(join(exampleDir, 'cost-analysis', 'plot.png'), {
    title: 'mean cost per op (USD, amoy, n=5) — sample',
    yLabel: 'USD',
    labels: ['registerProject', 'registerBatch', 'redeemProduct'],
    values: [
      j.perOp.registerProject.usdCost.mean,
      j.perOp.registerBatch.usdCost.mean,
      j.perOp.redeemProduct.usdCost.mean,
    ],
  });
  // eslint-disable-next-line no-console
  console.log(`wrote ${join(exampleDir, 'cost-analysis', 'plot.png')}`);
}

async function main(): Promise<void> {
  await buildPerfRegistrationPlot();
  await buildCostAnalysisPlot();
  // eslint-disable-next-line no-console
  console.log('Done.');
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
