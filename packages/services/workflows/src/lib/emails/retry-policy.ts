import type { EmailSendError } from './email-send-error.js';

/**
 * How many times a job hands an email to the provider: the first attempt and four retries, about
 * 90 seconds on graphile-worker's exponential backoff. The links these emails carry expire within
 * hours, so a longer budget only produces late duplicates.
 */
export const EMAIL_MAX_ATTEMPTS = 5;

/**
 * Whether a refusal rules out the same message ever being accepted, so the job must not retry it.
 * Postmark answers 422 for a request it will never take: an invalid or inactive recipient, or a
 * malformed request. An SMTP server's 5xx reply is permanent by RFC 5321, except 503, which only
 * says the command came in the wrong order. Everything else, rate limits, provider outages, 4xx
 * SMTP replies, is worth another attempt.
 */
export function isPermanentRefusal(error: EmailSendError): boolean {
  if (error.statusCode === null) {
    return false;
  }
  if (error.provider === 'postmark' || error.provider === 'mock') {
    return error.statusCode === 422;
  }
  return error.statusCode >= 500 && error.statusCode < 600 && error.statusCode !== 503;
}
