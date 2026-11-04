import type { JobHelpers } from 'graphile-worker';
import type { Context } from '../context';
import type { DeliveryRecorder } from '../lib/delivery-recorder';
import { makeLogger } from '../lib/metric-alert-test-utils';
import { task as auditLogExport } from './audit-log-export';
import { task as organizationInvitation } from './organization-invitation';
import { task as organizationOwnershipTransfer } from './organization-ownership-transfer';
import { task as usageRateLimitExceeded } from './usage-rate-limit-exceeded';
import { task as usageRateLimitWarning } from './usage-rate-limit-warning';

const rateLimit = {
  organizationId: 'o1',
  organizationName: 'Acme',
  limit: 1000,
  currentUsage: 950,
  startDate: 1,
  endDate: 2,
  subscriptionManagementLink: 'https://app/secret-link',
  email: 'owner@example.com',
};

// The invitation, transfer and export jobs are scheduled by an API request; the rate limit ones by
// the commerce cron, so they carry no request id.
const cases = [
  {
    name: 'organization invitation',
    requestId: 'req-1',
    task: organizationInvitation,
    input: {
      organizationId: 'o1',
      organizationName: 'Acme',
      code: 'secret-code',
      email: 'invitee@example.com',
      link: 'https://app/join/secret-code',
    },
    event: 'organization_invitation',
    to: 'invitee@example.com',
    subject: 'You have been invited to join Acme',
    secrets: ['secret-code'],
  },
  {
    name: 'ownership transfer',
    requestId: 'req-1',
    task: organizationOwnershipTransfer,
    input: {
      organizationId: 'o1',
      organizationName: 'Acme',
      authorName: 'Ada',
      email: 'new-owner@example.com',
      link: 'https://app/action/transfer/acme/secret-code',
    },
    event: 'organization_ownership_transfer',
    to: 'new-owner@example.com',
    subject: 'Organization transfer from Ada (Acme)',
    secrets: ['secret-code'],
  },
  {
    name: 'audit log export',
    requestId: 'req-1',
    task: auditLogExport,
    input: {
      organizationId: 'o1',
      organizationName: 'Acme',
      formattedStartDate: '2026-11-01',
      formattedEndDate: '2026-11-03',
      url: 'https://s3/secret-signed-url',
      email: 'auditor@example.com',
    },
    event: 'audit_log_export',
    to: 'auditor@example.com',
    subject: 'Hive - Audit Log Report',
    secrets: ['secret-signed-url'],
    extra: { period: '2026-11-01..2026-11-03' },
  },
  {
    name: 'usage rate limit warning',
    requestId: undefined,
    task: usageRateLimitWarning,
    input: rateLimit,
    event: 'usage_rate_limit_warning',
    to: 'owner@example.com',
    subject: 'Acme is approaching its rate limit',
    secrets: ['secret-link'],
    extra: { limit: '1000', current_usage: '950' },
  },
  {
    name: 'usage rate limit exceeded',
    requestId: undefined,
    task: usageRateLimitExceeded,
    input: rateLimit,
    event: 'usage_rate_limit_exceeded',
    to: 'owner@example.com',
    subject: 'GraphQL-Hive operations quota for Acme exceeded',
    secrets: ['secret-link'],
    extra: { limit: '1000', current_usage: '950' },
  },
];

describe('email tasks record their delivery', () => {
  test.each(cases)(
    '$name',
    async ({ task, requestId, input, event, to, subject, secrets, extra }) => {
      const record = vi.fn<DeliveryRecorder['record']>(async () => {});
      const send = vi
        .fn()
        .mockResolvedValue({ statusCode: 200, statusText: 'OK', messageId: 'mock-1' });
      const context = {
        email: { id: 'mock', send, history: [] },
        deliveries: { record },
        logger: makeLogger().logger,
      } as unknown as Context;
      const helpers = {
        job: {
          id: 'job-1',
          attempts: 1,
          max_attempts: 25,
          job_queue_id: null,
          priority: 0,
          task_id: 1,
        },
      } as unknown as JobHelpers;

      const [, run] = task(context);
      await run({ requestId, input }, helpers);

      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to, subject }));
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'o1',
          deliveryType: 'EMAIL',
          destination: to,
          event,
          attempt: 1,
          maxAttempts: 25,
          ok: true,
        }),
      );
      const { metadata } = record.mock.calls[0][0];
      expect(metadata).toEqual({
        subject,
        job_id: 'job-1',
        ...(requestId ? { hive_request_id: requestId } : {}),
        message_id: 'mock-1',
        ...(extra ?? {}),
      });
      for (const secret of secrets) {
        expect(JSON.stringify(metadata)).not.toContain(secret);
      }
    },
  );
});
