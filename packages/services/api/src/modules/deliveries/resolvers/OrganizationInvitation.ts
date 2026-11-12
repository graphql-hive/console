import { EmailDeliveries } from '../providers/email-deliveries';
import type { OrganizationInvitationResolvers } from './../../../__generated__/types';

// Invitations are only reachable through fields that require member:modify, so the parent
// resolver has authorized the read.
export const OrganizationInvitation: Pick<OrganizationInvitationResolvers, 'delivery'> = {
  delivery: (invitation, _arg, { injector }) =>
    injector.get(EmailDeliveries).getLatestInvitationDelivery(invitation),
};
