import type { JobHelpers } from 'graphile-worker';
import type { Logger } from '@graphql-hive/logger';
import type { Context } from '../../context.js';
import {
  deliveryOutcome,
  TIMED_OUT,
  trackDelivery,
  type DeliveryOutcome,
  type EmailDeliveryEvent,
} from '../delivery-recorder.js';
import { EmailSendError } from './email-send-error.js';
import type { EmailProvider } from './providers.js';

export interface SendTrackedEmailArgs {
  context: Pick<Context, 'email' | 'deliveries'>;
  helpers: JobHelpers;
  logger: Logger;
  /** Id of the request that scheduled the job, when one did. */
  requestId?: string;
  organizationId: string;
  event: EmailDeliveryEvent;
  email: Parameters<EmailProvider['send']>[0];
  /** Extra details that identify the message, recorded with it. Never a link, a code or a body. */
  metadata?: Record<string, string>;
}

/**
 * Sends one email through the configured vendor and records the attempt as an `EMAIL` delivery
 * to the recipient address: the vendor's answer, the job's attempt and retry budget, and the
 * subject and ids that locate the message (job, request, message id). The body and the links in
 * it are never recorded. A refusal is recorded and rethrown so graphile retries the job.
 */
export async function sendTrackedEmail(args: SendTrackedEmailArgs): Promise<void> {
  const { context, helpers, email } = args;

  await trackDelivery(
    context.deliveries,
    {
      organizationId: args.organizationId,
      deliveryType: 'EMAIL',
      destination: email.to,
      event: args.event,
      attempt: helpers.job.attempts,
      maxAttempts: helpers.job.max_attempts,
      metadata: {
        subject: email.subject,
        job_id: helpers.job.id,
        ...(args.requestId ? { hive_request_id: args.requestId } : {}),
        ...args.metadata,
      },
    },
    async () => {
      const result = await context.email.send(email);
      args.logger.info(
        {
          'email.provider': context.email.id,
          'email.event': args.event,
          'email.messageId': result.messageId,
        },
        'email accepted by the provider',
      );
      return {
        outcome: { statusCode: result.statusCode, statusText: result.statusText },
        value: undefined,
        metadata: result.messageId ? { message_id: result.messageId } : undefined,
      };
    },
    describeEmailError,
  );
}

// A timeout reaches here three ways: Postmark goes through fetch with `AbortSignal.timeout`, so
// its own timeout is a DOMException named TimeoutError, while undici's connect, headers and body
// timeouts arrive wrapped in `TypeError: fetch failed` as `cause`; nodemailer and sendmail put
// the socket's ETIMEDOUT on the error itself.
const TRANSPORT_TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

/**
 * The outcome of a failed send: the provider's refusal, with the status and text `EmailSendError`
 * carries, or a timeout of the request. Null for anything else, which the recorder masks: DNS and
 * connection failures, missing credentials, sendmail's MX lookup errors.
 */
export function describeEmailError(error: unknown): DeliveryOutcome | null {
  if (error instanceof EmailSendError) {
    return deliveryOutcome(error.statusCode, error.statusText);
  }
  if (error instanceof DOMException) {
    return error.name === 'TimeoutError' ? deliveryOutcome(null, TIMED_OUT) : null;
  }
  if (!isRecord(error)) {
    return null;
  }
  const cause = isRecord(error.cause) ? error.cause : null;
  const code =
    typeof error.code === 'string'
      ? error.code
      : typeof cause?.code === 'string'
        ? cause.code
        : null;
  return code !== null && TRANSPORT_TIMEOUT_CODES.has(code)
    ? deliveryOutcome(null, TIMED_OUT)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
