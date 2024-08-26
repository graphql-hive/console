import { AuditLogManager } from '../../../audit-logs/providers/audit-logs-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const exportOrganizationAuditLog: NonNullable<
  MutationResolvers['exportOrganizationAuditLog']
> = async (_parent, arg, ctx) => {
  const organizationId = arg.selector.organizationSlug;
  const auditLogManager = ctx.injector.get(AuditLogManager);

  return await auditLogManager.exportAndSendEmail(organizationId, {
    endDate: arg.filter?.endDate,
    startDate: arg.filter?.startDate,
  });
};
