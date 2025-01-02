import { AuditLogManager } from '../../../audit-logs/providers/audit-logs-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const exportOrganizationAuditLog: NonNullable<
  MutationResolvers['exportOrganizationAuditLog']
> = async (_parent, arg, ctx) => {
  const auditLogManager = ctx.injector.get(AuditLogManager);

  const result = await auditLogManager.exportAndSendEmail(arg.input.selector.organizationSlug, {
    endDate: arg.input.filter.endDate,
    startDate: arg.input.filter.startDate,
  });

  if (result.error) {
    return {
      error: {
        message: result.error.message,
      },
      ok: null,
    };
  }

  return {
    error: null,
    ok: {
      url: result.ok.url,
    },
  };
};
