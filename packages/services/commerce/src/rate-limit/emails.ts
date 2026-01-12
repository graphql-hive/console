import type { TaskScheduler } from '@hive/workflows/kit';
import { UsageRateLimitExceededTask } from '@hive/workflows/tasks/usage-rate-limit-exceeded';
import { UsageRateLimitWarningTask } from '@hive/workflows/tasks/usage-rate-limit-warning';
import { env } from '../environment';

export function createEmailScheduler(taskScheduler: TaskScheduler) {
  let scheduledEmails: Promise<unknown>[] = [];

  return {
    drain() {
      const drained = [...scheduledEmails];
      scheduledEmails = [];
      return drained;
    },
    limitExceeded(input: {
      organization: {
        name: string;
        id: string;
        slug: string;
        email: string;
      };
      period: {
        start: number;
        end: number;
      };
      usage: {
        quota: number;
        current: number;
      };
    }) {
      return scheduledEmails.push(
        taskScheduler.scheduleTask(
          UsageRateLimitExceededTask,
          {
            email: input.organization.email,
            organizationId: input.organization.id,
            organizationName: input.organization.name,
            limit: input.usage.quota,
            currentUsage: input.usage.current,
            startDate: input.period.start,
            endDate: input.period.end,
            subscriptionManagementLink: `${env.hiveServices.webAppUrl}/${
              input.organization.slug
            }/view/subscription`,
          },
          {
            dedupe: {
              key: p => p.organizationId,
              ttl: 1000 * 60 * 60 * 24 * 32,
            },
          },
        ),
      );
    },

    limitWarning(input: {
      organization: {
        name: string;
        id: string;
        slug: string;
        email: string;
      };
      period: {
        start: number;
        end: number;
      };
      usage: {
        quota: number;
        current: number;
      };
    }) {
      return scheduledEmails.push(
        taskScheduler.scheduleTask(
          UsageRateLimitWarningTask,
          {
            email: input.organization.email,
            organizationId: input.organization.id,
            organizationName: input.organization.name,
            limit: input.usage.quota,
            currentUsage: input.usage.current,
            startDate: input.period.start,
            endDate: input.period.end,
            subscriptionManagementLink: `${env.hiveServices.webAppUrl}/${
              input.organization.slug
            }/view/subscription`,
          },
          {
            dedupe: {
              key: p => p.organizationId,
              ttl: 1000 * 60 * 60 * 24 * 32,
            },
          },
        ),
      );
    },
  };
}
