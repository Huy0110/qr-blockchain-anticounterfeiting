/**
 * Standardised header line emitted by every experiment script's first
 * 5 lines (AC-EX-14). Reviewers + CI grep for the paper Table/Figure
 * being reproduced.
 */

export function printPaperHeader(args: {
  experiment: string;
  reproduces: string;
  network: string;
  trials: number;
  runId: string;
}): void {
  // eslint-disable-next-line no-console
  console.log(`==========================================================`);
  // eslint-disable-next-line no-console
  console.log(`Experiment: ${args.experiment}`);
  // eslint-disable-next-line no-console
  console.log(`Reproduces: ${args.reproduces}`);
  // eslint-disable-next-line no-console
  console.log(`Run ID: ${args.runId}  ·  Network: ${args.network}  ·  Trials: ${args.trials}`);
  // eslint-disable-next-line no-console
  console.log(`==========================================================`);
}
