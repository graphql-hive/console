import { EmailSendError } from './email-send-error.js';
import { isPermanentRefusal } from './retry-policy.js';

function refusal(
  provider: 'postmark' | 'mock' | 'smtp' | 'sendmail',
  statusCode: number | null,
): EmailSendError {
  return new EmailSendError('refused', { provider, statusCode, statusText: 'refused' });
}

describe('isPermanentRefusal', () => {
  test.each<[string, EmailSendError, boolean]>([
    [
      'Postmark rejects the request, e.g. an invalid or inactive recipient',
      refusal('postmark', 422),
      true,
    ],
    ['the mock provider mirrors that', refusal('mock', 422), true],
    ['Postmark rate-limits the call', refusal('postmark', 429), false],
    ['Postmark fails on its side', refusal('postmark', 500), false],
    ['Postmark is down for maintenance', refusal('postmark', 503), false],
    ['an SMTP server rejects the recipient for good', refusal('smtp', 550), true],
    ['an SMTP server rejects the message for good', refusal('smtp', 554), true],
    ['sendmail relays a permanent SMTP reply', refusal('sendmail', 550), true],
    ['an SMTP server asks to try later', refusal('smtp', 451), false],
    ['an SMTP server only complains about the command order', refusal('smtp', 503), false],
    ['a refusal without a code', refusal('sendmail', null), false],
  ])('%s', (_name, error, expected) => {
    expect(isPermanentRefusal(error)).toBe(expected);
  });
});
