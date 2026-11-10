import { EmailSendError } from './email-send-error';
import { describeEmailError } from './send-tracked-email';

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
