import type { EmailSendError } from './email-send-error.js';

/**
 * How many times a job hands an email to the provider: the first attempt and four retries, about
 * 90 seconds on graphile-worker's exponential backoff. The links these emails carry expire within
 * hours, so a longer budget only produces late duplicates.
 */
export const EMAIL_MAX_ATTEMPTS = 5;

/**
 * Whether a refusal rules out this message ever being accepted, so the job must not retry it.
 * Only a refusal of the message itself counts: Postmark's "Invalid email request" (error code
 * 300) and "Inactive recipient" (406), or an SMTP server's permanent reply to the envelope or the
 * message data (5xx, permanent by RFC 5321, except 503, which only says the command came in the
 * wrong order). A refusal of Hive's own account, credentials or message stream (Postmark 412,
 * 413, 1235, 1236; SMTP 535, 530; a refused STARTTLS or greeting) is retried on purpose, like a
 * rate limit or an outage: it fails the job, so it is counted and logged, and the job stays
 * reschedulable once the configuration is fixed.
 */
export function isPermanentRefusal(error: EmailSendError): boolean {
  if (error.statusCode === null) {
    return false;
  }
  switch (error.provider) {
    case 'postmark':
    case 'mock':
      return error.errorCode === '300' || error.errorCode === '406';
    case 'smtp':
      // nodemailer names the step that failed: EENVELOPE for MAIL FROM, RCPT TO and DATA,
      // EMESSAGE for the message body; EAUTH, ETLS and EPROTOCOL are the connection's own.
      return (
        isPermanentSmtpReply(error.statusCode) &&
        (error.errorCode === 'EENVELOPE' || error.errorCode === 'EMESSAGE')
      );
    case 'sendmail':
      // Delivers straight to the recipient's MX without authenticating, so any reply is about
      // the message.
      return isPermanentSmtpReply(error.statusCode);
  }
}

function isPermanentSmtpReply(code: number): boolean {
  return code >= 500 && code < 600 && code !== 503;
}
