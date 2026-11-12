import type { JobHelpers } from 'graphile-worker';
import type { Context } from '../../context';
import type { DeliveryRecorder } from '../delivery-recorder';
import { makeLogger } from '../metric-alert-test-utils';
import { EmailSendError } from './email-send-error';
import { describeEmailError, sendTrackedEmail } from './send-tracked-email';

describe('describeEmailError', () => {
  test.each<[string, unknown, { statusCode: number | null; statusText: string } | null]>([
    [
      'the provider refused the message',
      new EmailSendError('Invalid email request', {
        provider: 'postmark',
        statusCode: 422,
        statusText: 'Invalid email request (error code 300)',
        errorCode: '300',
      }),
      { statusCode: 422, statusText: 'Invalid email request (error code 300)' },
    ],
    [
      'the SMTP server refused the recipient',
      new EmailSendError('Message rejected', {
        provider: 'smtp',
        statusCode: 550,
        statusText: '550 5.1.1 No such user',
        errorCode: 'EENVELOPE',
      }),
      { statusCode: 550, statusText: '550 5.1.1 No such user' },
    ],
    [
      'the Postmark request hit its own timeout',
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      { statusCode: null, statusText: 'Timed out' },
    ],
    [
      'the Postmark connection timed out inside fetch',
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('Connect Timeout Error'), {
          code: 'UND_ERR_CONNECT_TIMEOUT',
        }),
      }),
      { statusCode: null, statusText: 'Timed out' },
    ],
    [
      'the SMTP connection timed out',
      Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT', command: 'CONN' }),
      { statusCode: null, statusText: 'Timed out' },
    ],
    [
      'the Postmark host did not resolve',
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.postmarkapp.com'), {
          code: 'ENOTFOUND',
        }),
      }),
      null,
    ],
    [
      'the SMTP host is unreachable',
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.3:587'), { code: 'ESOCKET' }),
      null,
    ],
    [
      'the SMTP credentials are missing',
      Object.assign(new Error('Missing credentials for "PLAIN"'), { code: 'EAUTH' }),
      null,
    ],
    ['sendmail could not find a mail server', new Error('can not resolve Mx of example.com'), null],
    ['an exception of our own', new TypeError('Cannot read properties of undefined'), null],
  ])('%s', (_name, error, expected) => {
    expect(describeEmailError(error)).toEqual(expected);
  });
});

describe('sendTrackedEmail', () => {
  const email = { to: 'invitee@example.com', subject: 'Invitation', body: '<p>Hi</p>' };

  function job(refusal: EmailSendError) {
    const record = vi.fn<DeliveryRecorder['record']>(async () => {});
    const { logger, warnings } = makeLogger();
    const context = {
      email: { id: refusal.provider, send: vi.fn().mockRejectedValue(refusal), history: [] },
      deliveries: { record },
    } as unknown as Context;
    const helpers = { job: { id: 'job-7', attempts: 2, max_attempts: 5 } } as unknown as JobHelpers;
    return {
      record,
      warnings,
      args: {
        context,
        helpers,
        logger,
        organizationId: 'o1',
        event: 'organization_invitation' as const,
        email,
      },
    };
  }

  test('a refusal that cannot change ends the job: recorded as the last attempt, not rethrown', async () => {
    const { record, warnings, args } = job(
      new EmailSendError('Inactive recipient', {
        provider: 'postmark',
        statusCode: 422,
        statusText:
          'You tried to send to a recipient that has been marked as inactive. (error code 406)',
        errorCode: '406',
      }),
    );

    await expect(sendTrackedEmail(args)).resolves.toBeUndefined();

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 422, attempt: 2, maxAttempts: 2 }),
    );
    expect(warnings).toHaveLength(1);
  });

  test('a refusal worth retrying is recorded with the full budget and rethrown', async () => {
    const refusal = new EmailSendError('Service Unavailable', {
      provider: 'postmark',
      statusCode: 503,
      statusText: 'The Postmark API is offline for maintenance. (error code 100)',
      errorCode: '100',
    });
    const { record, warnings, args } = job(refusal);

    await expect(sendTrackedEmail(args)).rejects.toBe(refusal);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 503, attempt: 2, maxAttempts: 5 }),
    );
    expect(warnings).toHaveLength(0);
  });
});
