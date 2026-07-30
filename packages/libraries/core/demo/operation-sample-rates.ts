/**
 * Demo / reproduction for operation-level sample rates.
 *
 * Scenario from the feature request: a system mixes a few very high-volume
 * operations with many low-volume ones. Global sampling forces a bad trade-off:
 *  - sample everything at 100% -> the high-volume ops blow the usage quota
 *  - sample everything at e.g. 5% -> the low-volume ops are missed entirely
 *
 * Operation-level sample rates let us sample the known high-volume operations
 * aggressively while keeping 100% visibility into low-volume operations.
 *
 * Run from the repo root:
 *   pnpm --filter @graphql-hive/core exec tsx demo/operation-sample-rates.ts
 * or from packages/libraries/core:
 *   pnpm exec tsx demo/operation-sample-rates.ts
 */
import { parse } from 'graphql';
import { operationSampling, randomSampling } from '../src/client/sampling.js';
import type { SamplingContext } from '../src/client/types.js';

const document = parse(/* GraphQL */ `
  query {
    __typename
  }
`);

function ctx(operationName: string): SamplingContext {
  return { operationName, document, variableValues: null, contextValue: undefined };
}

// A simulated traffic mix: operation name -> number of executions in the window.
const traffic: Array<{ operationName: string; volume: number }> = [
  { operationName: 'HighVolumeFeed', volume: 500_000 },
  { operationName: 'HighVolumePing', volume: 250_000 },
  { operationName: 'CheckoutMutation', volume: 1_200 },
  { operationName: 'AdminAuditReport', volume: 40 },
  { operationName: 'RareMigrationQuery', volume: 8 },
];

const totalOps = traffic.reduce((sum, t) => sum + t.volume, 0);

function simulate(shouldInclude: (c: SamplingContext) => boolean) {
  const sent = new Map<string, number>();
  for (const { operationName, volume } of traffic) {
    let count = 0;
    for (let i = 0; i < volume; i++) {
      if (shouldInclude(ctx(operationName))) count++;
    }
    sent.set(operationName, count);
  }
  return sent;
}

function pct(part: number, whole: number) {
  return whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(1)}%`;
}

function printResult(title: string, sent: Map<string, number>) {
  console.log(`\n=== ${title} ===`);
  let totalSent = 0;
  for (const { operationName, volume } of traffic) {
    const s = sent.get(operationName) ?? 0;
    totalSent += s;
    const visibility = s > 0 ? 'visible' : 'MISSED';
    console.log(
      `  ${operationName.padEnd(20)} volume=${String(volume).padStart(7)}  ` +
        `sent=${String(s).padStart(7)} (${pct(s, volume).padStart(6)})  ${visibility}`,
    );
  }
  console.log(
    `  ${'TOTAL'.padEnd(20)} volume=${String(totalOps).padStart(7)}  ` +
      `sent=${String(totalSent).padStart(7)} (${pct(totalSent, totalOps)} of quota)`,
  );
  return totalSent;
}

// --- Strategy A: global 100% sampling (full visibility, full quota cost) -----
const globalFull = printResult('Global sampleRate = 1.0 (overpay)', simulate(randomSampling(1.0)));

// --- Strategy B: global 5% sampling (cheap, but loses low-volume ops) --------
const globalLow = printResult(
  'Global sampleRate = 0.05 (low-volume ops missed)',
  simulate(randomSampling(0.05)),
);

// --- Strategy C: operation-level sample rates (the new feature) --------------
// Sample the high-volume ops at 1%, keep everything else at 100% via fallback.
const perOp = printResult(
  'Operation-level: /^HighVolume/ -> 1%, fallback 100%',
  simulate(
    operationSampling({
      rates: [{ regex: /^HighVolume/, sampleRate: 0.01 }],
      fallbackSampleRate: 1.0,
    }),
  ),
);

console.log('\n=== Summary ===');
console.log(`  Global 100%:        ${globalFull} ops billed (${pct(globalFull, totalOps)})`);
console.log(`  Global 5%:          ${globalLow} ops billed (${pct(globalLow, totalOps)})`);
console.log(`  Operation-level:    ${perOp} ops billed (${pct(perOp, totalOps)})`);
console.log(
  '\n  -> Operation-level sampling slashes billed volume like the cheap global rate,',
);
console.log('     while still reporting 100% of the low-volume operations.');
