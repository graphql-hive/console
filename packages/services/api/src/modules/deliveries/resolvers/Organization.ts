import { parseDateRangeInput } from '../../../shared/helpers';
import { EmailDeliveries, emailDeliverySelector } from '../providers/email-deliveries';
import type { OrganizationResolvers } from './../../../__generated__/types';

/** The organization's email deliveries, shaped like the delivery fields of an AlertChannel. */
export const Organization: Pick<
  OrganizationResolvers,
  'emailDeliveryHealth' | 'emailDeliveryLog' | 'emailDeliveryStats' | 'viewerCanSeeEmailDeliveries'
> = {
  // Authorized here once; the DeliveryStats fields then read for the selection.
  emailDeliveryStats: async (organization, { period }, { injector }) => {
    await injector.get(EmailDeliveries).assertCanRead(organization.id);
    return {
      selector: emailDeliverySelector(organization.id),
      period: parseDateRangeInput(period),
    };
  },
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
};
