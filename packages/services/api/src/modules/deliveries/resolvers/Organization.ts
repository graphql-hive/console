import { parseDateRangeInput } from '../../../shared/helpers';
import { EmailDeliveries } from '../providers/email-deliveries';
import type { OrganizationResolvers } from './../../../__generated__/types';

/**
 * The organization's email deliveries: stats and log shaped like an AlertChannel's, health
 * reduced to the last success and failure across recipients.
 */
export const Organization: Pick<
  OrganizationResolvers,
  | 'emailDeliveryHealth'
  | 'emailDeliveryLog'
  | 'emailDeliveryStats'
  | 'viewerCanSeeEmailDeliveries'
  | 'viewerEmailDeliveryVisibility'
> = {
  // Authorized here once; the DeliveryStats fields then read for the selection.
  emailDeliveryStats: async (organization, { period }, { injector }) => ({
    selector: await injector.get(EmailDeliveries).readableSelector(organization.id),
    period: parseDateRangeInput(period),
  }),
  emailDeliveryHealth: (organization, _arg, { injector }) =>
    injector.get(EmailDeliveries).getHealth(organization.id),
  emailDeliveryLog: (organization, { period, limit }, { injector }) =>
    injector.get(EmailDeliveries).getLog({
      organizationId: organization.id,
      period: parseDateRangeInput(period),
      limit: limit ?? undefined,
    }),
  viewerCanSeeEmailDeliveries: (organization, _arg, { injector }) =>
    injector.get(EmailDeliveries).canRead(organization.id),
  viewerEmailDeliveryVisibility: (organization, _arg, { injector }) =>
    injector.get(EmailDeliveries).getVisibility(organization.id),
};
