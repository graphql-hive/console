/**
 *
 * Just a small playground to play around with different scenarios arounf the agent.
 * You can run it like this: `bun run --watch packages/libraries/core/playground/agent-circuit-breaker.ts`
 */

import { createAgent } from '../src/client/agent.js';

let data: Array<{}> = [];

const agent = createAgent<{}>(
  {
    debug: true,
    endpoint: 'http://127.0.0.1',
    token: 'noop',
    async fetch(url, opts) {
      // throw new Error('FAIL FAIL');
      console.log('SENDING!');
      return new Response('ok', {
        status: 200,
      });
    },
    circuitBreaker: {
      timeout: 1_000,
      errorThresholdPercentage: 1,
      resetTimeout: 10_000,
      volumeThreshold: 0,
    },
    maxSize: 1,
    maxRetries: 0,
  },
  {
    body() {
      data = [];
      return String(data);
    },
    data: {
      clear() {
        data = [];
      },
      size() {
        return data.length;
      },
      set(d) {
        data.push(d);
      },
    },
  },
);

setInterval(() => {
  agent.capture({});
}, 1_000);
