import type { EmailProviders } from './providers.js';

/**
 * The mail vendor answered and refused the message. Transport failures (DNS, connection,
 * timeout) are not wrapped: they carry no answer from the vendor.
 */
export class EmailSendError extends Error {
  /** HTTP status (Postmark) or SMTP reply code; null when the answer carried none. */
  readonly statusCode: number | null;
  /** One line describing the refusal: the provider's message with its error code, or the SMTP reply. */
  readonly statusText: string;
  /** The vendor's own error code (Postmark `ErrorCode`, nodemailer `code`); null when it has none. */
  readonly errorCode: string | null;
  readonly provider: EmailProviders;

  constructor(
    message: string,
    options: {
      provider: EmailProviders;
      statusCode: number | null;
      statusText: string;
      errorCode?: string | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'EmailSendError';
    this.provider = options.provider;
    this.statusCode = options.statusCode;
    this.statusText = options.statusText;
    this.errorCode = options.errorCode ?? null;
  }
}
