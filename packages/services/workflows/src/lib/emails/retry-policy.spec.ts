import { EmailSendError } from './email-send-error.js';
import { isPermanentRefusal } from './retry-policy.js';

function refusal(
  provider: 'postmark' | 'mock' | 'smtp' | 'sendmail',
  statusCode: number | null,
  errorCode: string | null = null,
): EmailSendError {
  return new EmailSendError('refused', { provider, statusCode, statusText: 'refused', errorCode });
}

describe('isPermanentRefusal', () => {
  test.each<[string, EmailSendError, boolean]>([
    [
      'Postmark rejects the request, e.g. an invalid recipient',
      refusal('postmark', 422, '300'),
      true,
    ],
    ['Postmark rejects an inactive recipient', refusal('postmark', 422, '406'), true],
    ['the mock provider mirrors that', refusal('mock', 422, '406'), true],
    ['the Postmark account is pending approval', refusal('postmark', 422, '412'), false],
    ['the Postmark account may not send', refusal('postmark', 422, '413'), false],
    ['the Postmark message stream does not exist', refusal('postmark', 422, '1235'), false],
    ['Postmark rejects the request without saying why', refusal('postmark', 422), false],
    ['Postmark rate-limits the call', refusal('postmark', 429), false],
    ['Postmark fails on its side', refusal('postmark', 500), false],
    ['Postmark is down for maintenance', refusal('postmark', 503), false],
    ['an SMTP server rejects the recipient for good', refusal('smtp', 550, 'EENVELOPE'), true],
    ['an SMTP server rejects the message for good', refusal('smtp', 554, 'EMESSAGE'), true],
    ['an SMTP server rejects the credentials', refusal('smtp', 535, 'EAUTH'), false],
    ['an SMTP server requires authentication', refusal('smtp', 530, 'EAUTH'), false],
    [
      'an SMTP server refuses the session in its greeting',
      refusal('smtp', 554, 'EPROTOCOL'),
      false,
    ],
    ['an SMTP server asks to try later', refusal('smtp', 451, 'EENVELOPE'), false],
    [
      'an SMTP server only complains about the command order',
      refusal('smtp', 503, 'EENVELOPE'),
      false,
    ],
    ['sendmail relays a permanent SMTP reply', refusal('sendmail', 550), true],
    ['a refusal without a code', refusal('sendmail', null), false],
  ])('%s', (_name, error, expected) => {
    expect(isPermanentRefusal(error)).toBe(expected);
  });
});
