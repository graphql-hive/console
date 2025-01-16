import { AuditLogManager } from '../../../audit-logs/providers/audit-logs-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import type { MutationResolvers } from './../../../../__generated__/types';

export const exportOrganizationAuditLog: NonNullable<
  MutationResolvers['exportOrganizationAuditLog']
> = async (_parent, arg, { injector }) => {
  const organizationId = await injector
    .get(IdTranslator)
    .translateOrganizationId(arg.input.selector);

  const result = await injector.get(AuditLogManager).exportAndSendEmail(organizationId, {
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
