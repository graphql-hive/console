import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import * as readline from 'node:readline/promises';
import { DEFAULT_SCENARIO, scenarios } from '../scenarios';

/**
 * Launcher for `pnpm dev:mock`. Asks which scenario to start with, then runs the watched
 * server (./start.ts) with the answers in env. Prompting here rather than in the server
 * means a file save restarts the server without asking again.
 *
 * Skipped when stdin is not a terminal or HIVE_MOCK_SCENARIO is already set.
 */

/* eslint-disable no-process-env */

async function prompt(): Promise<{ scenario: string; latency: number }> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const names = Object.keys(scenarios);
    console.log('\nMock mode. Pick a starting scenario:\n');
    for (const [i, name] of names.entries()) {
      const marker = name === DEFAULT_SCENARIO ? ' (default)' : '';
      console.log(`  ${i + 1}. ${name}${marker}`);
      console.log(`     ${scenarios[name].description}`);
    }
    console.log('');

    const scenario = await ask(
      rl,
      `Scenario [1-${names.length}, Enter for ${DEFAULT_SCENARIO}]: `,
      answer => {
        if (answer === '') return DEFAULT_SCENARIO;
        const index = Number(answer);
        if (Number.isInteger(index) && index >= 1 && index <= names.length) {
          return names[index - 1];
        }
        return answer in scenarios ? answer : undefined;
      },
    );

    const latency = await ask(rl, 'Response latency in ms [Enter for 0]: ', answer => {
      if (answer === '') return 0;
      const value = Number(answer);
      return Number.isInteger(value) && value >= 0 ? value : undefined;
    });

    return { scenario, latency };
  } finally {
    rl.close();
  }
}

async function ask<T>(
  rl: readline.Interface,
  label: string,
  parse: (answer: string) => T | undefined,
): Promise<T> {
  for (;;) {
    const parsed = parse((await rl.question(label)).trim());
    if (parsed !== undefined) return parsed;
    console.log('  Not a valid choice, try again.');
  }
}

const env = { ...process.env };

if (!env.HIVE_MOCK_SCENARIO && process.stdin.isTTY) {
  const answers = await prompt();
  env.HIVE_MOCK_SCENARIO = answers.scenario;
  if (answers.latency > 0) env.HIVE_MOCK_LATENCY = String(answers.latency);
}

// Identifies this run. Control cookies are stamped with it so a browser cookie left over
// from a previous run cannot override the scenario chosen above. Watch restarts inherit it.
env.HIVE_MOCK_SESSION ??= Date.now().toString(36);

const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');
const server = spawn(
  process.execPath,
  [
    tsxCli,
    'watch',
    '--clear-screen=false',
    '--exclude',
    './**/*.mjs',
    'src/dev/mock-server/start.ts',
  ],
  { stdio: 'inherit', env },
);

server.on('exit', code => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.kill(signal));
}
