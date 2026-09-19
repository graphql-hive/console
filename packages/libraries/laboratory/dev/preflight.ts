/**
 * Seed preflight for the dev harness, applied by src/main.tsx on every load. One script
 * covers the behaviours that are otherwise fiddly to reach by hand: the prompt and its
 * metadata, cancelling, streaming logs, stopping a run, the execution timeout, and the
 * warning for environment values that cannot be interpolated.
 *
 * It is seeded enabled, so running an operation from the Query tab prompts too — that path
 * is the one that silently did nothing before this branch.
 */
import type { LaboratoryPreflight } from '../src/lib/preflight';

export const devPreflightScenarios = ['logs', 'slow', 'loop', 'env', 'headers', 'error'] as const;

const script = `const scenario = await lab.prompt('Demo scenario', 'logs', {
  placeholder: '${devPreflightScenarios.join(' | ')}',
  description: 'Pick which preflight behaviour to exercise. Cancel to skip the run.',
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

if (scenario === null) {
  console.info('Prompt cancelled, so the script stops here and the request still goes out.');
} else if (scenario === 'logs') {
  // Watch the log pane fill in while this runs, rather than all at once at the end.
  for (let step = 1; step <= 10; step++) {
    console.log('step ' + step + ' of 10');
    await sleep(300);
  }

  console.info('Done.');
} else if (scenario === 'slow') {
  console.warn('Waiting a minute. Press Stop, or leave it to hit the execution timeout.');
  await sleep(60000);
  console.log('Only reached if nothing stops the run.');
} else if (scenario === 'loop') {
  // Blocks the worker thread outright, so nothing but Stop or the timeout ends it.
  console.warn('Blocking the worker. Stop or the timeout has to end this one.');
  while (true) {}
} else if (scenario === 'env') {
  lab.environment.set('kept', 'a string survives');
  lab.environment.set('dropped', { nope: true });
  console.log('Check the Env tab: only "kept" should be there.');
} else if (scenario === 'headers') {
  lab.request.headers.set('x-demo-token', 'abc123');
  console.log('Header set; the run reports the headers it produced.');
} else if (scenario === 'error') {
  console.log('This log should report the line it was written on, and so should the throw.');
  throw new Error('boom from the error scenario');
} else {
  console.error('Unknown scenario: ' + scenario);
}`;

export const devPreflight: LaboratoryPreflight = {
  enabled: true,
  script,
};
