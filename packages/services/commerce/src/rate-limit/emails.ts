import type { EmailsApi } from '@hive/emails';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { env } from '../environment';

export function createEmailScheduler(config?: { endpoint: string }) {
  const api = config?.endpoint
    ? createTRPCProxyClient<EmailsApi>({
        links: [
          httpLink({
            url: `${config.endpoint}/trpc`,
            fetch,
          }),
        ],
      })
    : null;

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
      if (!api) {
        return scheduledEmails.push(Promise.resolve());
      }

      return scheduledEmails.push(
        api.sendRateLimitExceededEmail.mutate({
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
        }),
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
      if (!api) {
        return scheduledEmails.push(Promise.resolve());
      }

      return scheduledEmails.push(
        api.sendRateLimitWarningEmail.mutate({
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
        }),
      );
    },
  };
}
