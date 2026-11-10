import type { Action } from '../clickhouse';

/**
 * The attempts to deliver one notification share an idempotency key: the Idempotency-Key the
 * alert channel senders already transmit, or for an invitation email the key the API assigns from
 * the recipient and the invitation's creation time. As a column it groups attempts and answers
 * "the latest attempt per notification" without reading `metadata`. Rows written before the
 * column take their key from the metadata they recorded (the webhook header, or Slack's message
 * metadata); the few without one stay empty.
 */
export const action: Action = async exec => {
  await exec(`
    ALTER TABLE "outbound_deliveries"
    ADD COLUMN IF NOT EXISTS "idempotency_key" String CODEC(ZSTD(1)) AFTER "event"
  `);

  await exec(
    `
    ALTER TABLE "outbound_deliveries"
    UPDATE "idempotency_key" = if(
      mapContains("metadata", 'Idempotency-Key'),
      "metadata"['Idempotency-Key'],
      "metadata"['idempotency_key']
    )
    WHERE "idempotency_key" = ''
  `,
    { mutations_sync: '2' },
  );
};
