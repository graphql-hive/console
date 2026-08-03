import { makeLogger } from '../metric-alert-test-utils.js';
import { sendWebhook } from './send-webhook.js';

describe('sendWebhook', () => {
  // graphile-worker increments `attempts` before running the job, so on the final
  // attempt `attempts === max_attempts` and the webhook is never actually posted.
  // No network mock needed: this returns before touching `got`.
  test('gives up without posting once the retry budget is spent', async () => {
    const { logger, warnings } = makeLogger();

    const result = await sendWebhook(logger, null, {
      attempt: 25,
      maxAttempts: 25,
      endpoint: 'http://localhost:9876/never-called',
      data: {},
    });

    expect(result).toEqual({ status: 'gave-up' });
    expect(warnings).toHaveLength(1);
  });
});
