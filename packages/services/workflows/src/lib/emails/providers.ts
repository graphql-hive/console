import nodemailer from 'nodemailer';
import sm from 'sendmail';
import { EmailSendError } from './email-send-error.js';

/** `sendmail` hands these to mailcomposer, which also reads `textEncoding`; the types omit it. */
type SendmailMailInput = Parameters<ReturnType<typeof sm>>[0] & { textEncoding?: 'base64' };

interface Email {
  to: string;
  subject: string;
  body: string;
  date: Date;
}

export type EmailProviders = 'postmark' | 'mock' | 'smtp' | 'sendmail';

/** What the vendor answered when it accepted the message. */
export interface EmailSendResult {
  /** HTTP status (Postmark) or SMTP reply code; null when the answer carried none. */
  statusCode: number | null;
  /** The HTTP reason phrase or the SMTP reply line. */
  statusText: string;
  /**
   * What identifies the message afterwards: Postmark's MessageID, or for SMTP the Message-ID
   * header nodemailer gave the message (the server's own queue id is in the reply, `statusText`).
   * Null when there is none.
   */
  messageId: string | null;
}

export interface EmailProvider {
  id: EmailProviders;
  /** Resolves once the vendor accepted the message; throws `EmailSendError` when it refused it. */
  send(email: Omit<Email, 'date'>): Promise<EmailSendResult>;
  history: Email[];
}

type PostmarkEmailProviderConfig = {
  provider: 'postmark';
  token: string;
  messageStream: string;
};

type MockEmailProviderConfig = {
  provider: 'mock';
};

type SMTPEmailProviderConfig = {
  provider: 'smtp';
  protocol: 'smtp' | 'smtps';
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  tls: {
    rejectUnauthorized: boolean;
  };
  ignoreTLS: boolean;
};

type SendmailEmailProviderConfig = {
  provider: 'sendmail';
};

type EmailProviderConfig =
  | SMTPEmailProviderConfig
  | PostmarkEmailProviderConfig
  | SendmailEmailProviderConfig
  | MockEmailProviderConfig;

export function createEmailProvider(config: EmailProviderConfig, emailFrom: string): EmailProvider {
  switch (config.provider) {
    case 'mock':
      return mock(config, emailFrom);
    case 'postmark':
      return postmark(config, emailFrom);
    case 'smtp':
      return smtp(config, emailFrom);
    case 'sendmail':
      return sendmail(config, emailFrom);
  }
}

const POSTMARK_TIMEOUT_MS = 15_000;

function postmark(config: PostmarkEmailProviderConfig, emailFrom: string): EmailProvider {
  return {
    id: 'postmark' as const,
    async send(email) {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Postmark-Server-Token': config.token,
        },
        body: JSON.stringify({
          From: emailFrom,
          To: email.to,
          Subject: email.subject,
          HtmlBody: email.body,
          MessageStream: config.messageStream,
        }),
        signal: AbortSignal.timeout(POSTMARK_TIMEOUT_MS),
      });
      const details = parsePostmarkBody(await response.text());

      if (!response.ok) {
        throw new EmailSendError(details?.message ?? response.statusText, {
          provider: 'postmark',
          statusCode: response.status,
          statusText:
            details?.errorCode != null
              ? `${details.message ?? response.statusText} (error code ${details.errorCode})`
              : response.statusText,
          errorCode: details?.errorCode != null ? String(details.errorCode) : null,
        });
      }

      return {
        statusCode: response.status,
        // HTTP/2 answers carry no reason phrase; Postmark's body then says "OK" itself.
        statusText: response.statusText || details?.message || '',
        messageId: details?.messageId ?? null,
      };
    },
    history: [],
  };
}

/** The fields Hive reads from a Postmark answer; any body that is not a JSON object yields null. */
function parsePostmarkBody(
  text: string,
): { messageId: string | null; errorCode: number | null; message: string | null } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { MessageID, ErrorCode, Message } = body as Record<string, unknown>;
  return {
    messageId: typeof MessageID === 'string' && MessageID.length > 0 ? MessageID : null,
    errorCode: typeof ErrorCode === 'number' ? ErrorCode : null,
    message: typeof Message === 'string' && Message.length > 0 ? Message : null,
  };
}

function mock(_config: MockEmailProviderConfig, _emailFrom: string): EmailProvider {
  const history: Email[] = [];

  return {
    id: 'mock' as const,
    async send(email) {
      // Test hook: a recipient like `someone+bounce@example.com` is refused the way Postmark
      // refuses an inactive address, and is not "sent", so `history` keeps meaning accepted.
      if (localPart(email.to).endsWith('+bounce')) {
        throw new EmailSendError('Inactive recipient', {
          provider: 'mock',
          statusCode: 422,
          statusText:
            'You tried to send to a recipient that has been marked as inactive. (error code 406)',
          errorCode: '406',
        });
      }
      history.push({
        ...email,
        date: new Date(),
      });
      return { statusCode: 200, statusText: 'OK', messageId: `mock-${history.length}` };
    },
    history,
  };
}

function localPart(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? address : address.slice(0, at);
}

function smtp(config: SMTPEmailProviderConfig, emailFrom: string): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.protocol === 'smtps',
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    tls: {
      rejectUnauthorized: config.tls.rejectUnauthorized,
    },
    ignoreTLS: config.ignoreTLS,
  });

  return {
    id: 'smtp' as const,
    async send(email) {
      let info;
      try {
        info = await transporter.sendMail({
          from: emailFrom,
          to: email.to,
          subject: email.subject,
          html: email.body,
        });
      } catch (error) {
        // nodemailer puts the server's reply on the error; transport errors have none.
        if (isRecord(error) && typeof error.responseCode === 'number') {
          throw new EmailSendError(messageOf(error), {
            provider: 'smtp',
            statusCode: error.responseCode,
            statusText: oneLine(
              typeof error.response === 'string' && error.response.length > 0
                ? error.response
                : messageOf(error),
            ),
            errorCode: typeof error.code === 'string' ? error.code : null,
            cause: error,
          });
        }
        throw error;
      }

      const reply = oneLine(info.response);
      return {
        statusCode: smtpReplyCode(reply),
        statusText: reply,
        messageId: info.messageId || null,
      };
    },
    history: [],
  };
}

function sendmail(_config: SendmailEmailProviderConfig, emailFrom: string): EmailProvider {
  const client = sm({});

  return {
    id: 'sendmail' as const,
    async send(email) {
      let reply: string;
      try {
        reply = await new Promise<string>((resolve, reject) => {
          client(
            {
              from: emailFrom,
              to: email.to,
              subject: email.subject,
              html: email.body,
              // `sendmail` writes the message into SMTP DATA without doubling a line's leading
              // dot, as RFC 5321 §4.5.2 requires, so the receiving server drops that dot. Its
              // default quoted-printable body wraps at 76 characters and can start a line with
              // the "." of a URL: an invite to `…prod.proddsl.zzzzzzz…` arrived as
              // `…prod.proddslzzzzzzz…` (#7702). Base64 has no "." in its alphabet.
              textEncoding: 'base64',
            } as SendmailMailInput,
            (err, reply) => {
              if (err) {
                reject(err);
              } else {
                resolve(reply);
              }
            },
          );
        });
      } catch (error) {
        // `sendmail` reports a refusal as `Error('SMTP code:<code> msg:<reply>')`.
        const refusal = /^SMTP code:(\d{3}) msg:([\s\S]*)$/.exec(messageOf(error));
        if (refusal) {
          const text = oneLine(refusal[2]);
          throw new EmailSendError(text, {
            provider: 'sendmail',
            statusCode: Number(refusal[1]),
            statusText: text,
            cause: error,
          });
        }
        throw error;
      }

      // The reply `sendmail` hands back is the last one it read, the server's answer to QUIT
      // (221); the message itself was accepted at the 250 before it.
      const text = oneLine(String(reply ?? ''));
      return { statusCode: smtpReplyCode(text), statusText: text, messageId: null };
    },
    history: [],
  };
}

/** The three-digit code an SMTP reply line starts with; null when the text is not a reply. */
export function smtpReplyCode(reply: string): number | null {
  const match = /^(\d{3})(?:[ -]|$)/.exec(reply);
  return match ? Number(match[1]) : null;
}

/** A multi-line SMTP reply as one line. */
function oneLine(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ');
}

function messageOf(error: unknown): string {
  return isRecord(error) && typeof error.message === 'string' ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
