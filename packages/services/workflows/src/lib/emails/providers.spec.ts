import { createRequire } from 'node:module';
import { EmailSendError } from './email-send-error';
import { createEmailProvider } from './providers';

const sent: Array<Record<string, unknown>> = [];

vi.mock('sendmail', () => ({
  default:
    () => (mail: Record<string, unknown>, callback: (err: Error | null, reply: string) => void) => {
      sent.push(mail);
      if (String(mail.to).endsWith('@refused.test')) {
        callback(new Error('SMTP code:550 msg:550 5.1.1 No such user'), '');
        return;
      }
      // sendmail hands back the last reply it read: the server's answer to QUIT.
      callback(null, '221 2.0.0 Bye\r\n');
    },
}));

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

/** The message `sendmail` would put on the wire, built by the mailcomposer it depends on. */
function buildLikeSendmail(mail: Record<string, unknown>): Promise<string> {
  const requireFromSendmail = createRequire(createRequire(import.meta.url).resolve('sendmail'));
  const mailcomposer = requireFromSendmail('mailcomposer');
  return new Promise((resolve, reject) =>
    mailcomposer(mail).build((err: Error | null, message: Buffer) =>
      err ? reject(err) : resolve(message.toString()),
    ),
  );
}

const email = { to: 'someone@example.com', subject: 'Invitation', body: '<p>Hi</p>' };

describe('postmark provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  const provider = () =>
    createEmailProvider(
      { provider: 'postmark', token: 'token-1', messageStream: 'outbound' },
      'hive@example.com',
    );

  test('returns the accepted status and the Postmark message id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ MessageID: 'pm-1', ErrorCode: 0, Message: 'OK' }), {
          status: 200,
          statusText: 'OK',
        }),
      ),
    );

    await expect(provider().send(email)).resolves.toEqual({
      statusCode: 200,
      statusText: 'OK',
      messageId: 'pm-1',
    });
  });

  test('a rejected recipient is an EmailSendError with the Postmark code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ErrorCode: 406,
            Message: 'You tried to send to a recipient that has been marked as inactive.',
          }),
          { status: 422, statusText: 'Unprocessable Entity' },
        ),
      ),
    );

    const error = await provider()
      .send(email)
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(error).toBeInstanceOf(EmailSendError);
    expect(error).toMatchObject({
      provider: 'postmark',
      statusCode: 422,
      statusText:
        'You tried to send to a recipient that has been marked as inactive. (error code 406)',
      errorCode: '406',
      message: 'You tried to send to a recipient that has been marked as inactive.',
    });
  });

  test('a non-JSON failure keeps the HTTP status and reason phrase', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('upstream down', { status: 503, statusText: 'Service Unavailable' }),
        ),
    );

    await expect(provider().send(email)).rejects.toMatchObject({
      provider: 'postmark',
      statusCode: 503,
      statusText: 'Service Unavailable',
      errorCode: null,
    });
  });
});

describe('smtp provider', () => {
  const provider = () =>
    createEmailProvider(
      {
        provider: 'smtp',
        protocol: 'smtp',
        host: 'mail.example.com',
        port: 587,
        auth: { user: 'u', pass: 'p' },
        tls: { rejectUnauthorized: true },
        ignoreTLS: false,
      },
      'hive@example.com',
    );

  beforeEach(() => {
    sendMail.mockReset();
  });

  test('returns the reply code, the reply and the message id', async () => {
    sendMail.mockResolvedValue({
      messageId: '<abc@mail.example.com>',
      response: '250 2.0.0 OK: queued as 123',
      accepted: [email.to],
      rejected: [],
      pending: [],
      envelope: {},
    });

    await expect(provider().send(email)).resolves.toEqual({
      statusCode: 250,
      statusText: '250 2.0.0 OK: queued as 123',
      messageId: '<abc@mail.example.com>',
    });
  });

  test('a server rejection is an EmailSendError with the reply', async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error('Message rejected'), {
        code: 'EENVELOPE',
        responseCode: 550,
        response: '550 5.1.1 No such user',
        command: 'RCPT TO',
      }),
    );

    await expect(provider().send(email)).rejects.toMatchObject({
      provider: 'smtp',
      statusCode: 550,
      statusText: '550 5.1.1 No such user',
      errorCode: 'EENVELOPE',
    });
  });

  test('a connection failure is passed through untouched', async () => {
    const failure = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNECTION' });
    sendMail.mockRejectedValue(failure);

    await expect(provider().send(email)).rejects.toBe(failure);
  });
});

describe('sendmail provider', () => {
  const provider = () => createEmailProvider({ provider: 'sendmail' }, 'hive@example.com');

  test('returns the SMTP reply', async () => {
    await expect(provider().send(email)).resolves.toEqual({
      statusCode: 221,
      statusText: '221 2.0.0 Bye',
      messageId: null,
    });
  });

  test('a refused recipient is an EmailSendError with the reply code and text', async () => {
    await expect(provider().send({ ...email, to: 'nobody@refused.test' })).rejects.toMatchObject({
      provider: 'sendmail',
      statusCode: 550,
      statusText: '550 5.1.1 No such user',
    });
  });

  test('no line of the message starts with a dot, which SMTP would drop (#7702)', async () => {
    const url =
      'https://graphql-hive-dataservicelayer-prod.proddsl.zzzzzzz.aa.bbbbbb.cccc/join/3f6f16d1c';

    // Quoted-printable wraps at 76 characters; slide the URL through every alignment.
    for (let pad = 0; pad < 80; pad++) {
      sent.length = 0;
      await provider().send({
        to: 'someone@example.com',
        subject: 'Invitation',
        body: `<p>${'x'.repeat(pad)}<a href="${url}">${url}</a></p>`,
      });
      const message = await buildLikeSendmail(sent[0]);
      expect(message.split(/\r?\n/).filter(line => line.startsWith('.'))).toEqual([]);
    }
  });
});

describe('mock provider', () => {
  test('a +bounce recipient is rejected like an inactive Postmark recipient and not kept', async () => {
    const provider = createEmailProvider({ provider: 'mock' }, 'hive@example.com');

    await expect(
      provider.send({ ...email, to: 'someone+bounce@example.com' }),
    ).rejects.toMatchObject({
      provider: 'mock',
      statusCode: 422,
      statusText:
        'You tried to send to a recipient that has been marked as inactive. (error code 406)',
      errorCode: '406',
    });
    expect(provider.history).toEqual([]);
  });
});
