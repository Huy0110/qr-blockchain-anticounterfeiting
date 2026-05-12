/**
 * Plot generators. `chartjs-node-canvas` renders Chart.js charts to PNG
 * server-side. We keep the API tiny — three generators that cover the
 * paper's figures.
 *
 * Each generator returns the resolved file path so callers can log it.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartJSNodeCanvasModule = any;

const WIDTH = 800;
const HEIGHT = 480;

let cachedCanvas: unknown = null;
async function getCanvas(): Promise<{ renderToBuffer: (cfg: unknown) => Promise<Buffer> }> {
  if (cachedCanvas) return cachedCanvas as { renderToBuffer: (cfg: unknown) => Promise<Buffer> };
  const mod = (await import('chartjs-node-canvas')) as ChartJSNodeCanvasModule;
  const Cls = mod.ChartJSNodeCanvas as new (opts: { width: number; height: number }) => {
    renderToBuffer: (cfg: unknown) => Promise<Buffer>;
  };
  cachedCanvas = new Cls({ width: WIDTH, height: HEIGHT });
  return cachedCanvas as { renderToBuffer: (cfg: unknown) => Promise<Buffer> };
}

export interface BarPlotInput {
  title: string;
  labels: readonly string[];
  values: readonly number[];
  yLabel?: string;
}

/** Bar plot: one series of named values. */
export async function writeBarPlot(path: string, input: BarPlotInput): Promise<string> {
  const canvas = await getCanvas();
  const buffer = await canvas.renderToBuffer({
    type: 'bar',
    data: {
      labels: [...input.labels],
      datasets: [
        {
          label: input.yLabel ?? input.title,
          data: [...input.values],
          backgroundColor: 'hsl(142, 71%, 30%)',
        },
      ],
    },
    options: {
      plugins: { title: { display: true, text: input.title } },
      scales: { y: { beginAtZero: true } },
    },
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
  return path;
}

export interface BoxPlotInput {
  title: string;
  /** One bucket per category — values used to compute mean/min/max. */
  buckets: ReadonlyArray<{ label: string; values: readonly number[] }>;
  yLabel?: string;
}

/**
 * Pseudo-boxplot: Chart.js core lacks a native boxplot, so we render
 * a bar with min/mean/max marker triple per category. Good enough for
 * the paper's distribution figures and avoids the chartjs-chart-boxplot
 * dependency.
 */
export async function writeBoxPlot(path: string, input: BoxPlotInput): Promise<string> {
  const canvas = await getCanvas();
  const labels = input.buckets.map((b) => b.label);
  const means = input.buckets.map((b) =>
    b.values.length === 0 ? 0 : b.values.reduce((s, v) => s + v, 0) / b.values.length,
  );
  const mins = input.buckets.map((b) => (b.values.length === 0 ? 0 : Math.min(...b.values)));
  const maxs = input.buckets.map((b) => (b.values.length === 0 ? 0 : Math.max(...b.values)));
  const buffer = await canvas.renderToBuffer({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'min',
          data: mins,
          backgroundColor: 'hsl(210, 30%, 60%)',
        },
        {
          label: 'mean',
          data: means,
          backgroundColor: 'hsl(142, 71%, 30%)',
        },
        {
          label: 'max',
          data: maxs,
          backgroundColor: 'hsl(0, 70%, 42%)',
        },
      ],
    },
    options: {
      plugins: { title: { display: true, text: input.title } },
      scales: { y: { beginAtZero: true, title: { display: true, text: input.yLabel ?? 'ms' } } },
    },
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
  return path;
}

export interface LinePlotInput {
  title: string;
  labels: readonly string[];
  series: ReadonlyArray<{ label: string; values: readonly number[] }>;
  yLabel?: string;
}

export async function writeLinePlot(path: string, input: LinePlotInput): Promise<string> {
  const canvas = await getCanvas();
  const colors = ['hsl(142, 71%, 30%)', 'hsl(28, 92%, 38%)', 'hsl(0, 70%, 42%)'];
  const buffer = await canvas.renderToBuffer({
    type: 'line',
    data: {
      labels: [...input.labels],
      datasets: input.series.map((s, i) => ({
        label: s.label,
        data: [...s.values],
        borderColor: colors[i % colors.length],
        fill: false,
      })),
    },
    options: {
      plugins: { title: { display: true, text: input.title } },
      scales: { y: { beginAtZero: true, title: { display: true, text: input.yLabel ?? '' } } },
    },
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
  return path;
}
