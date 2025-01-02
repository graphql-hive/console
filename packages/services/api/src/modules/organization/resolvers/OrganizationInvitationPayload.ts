import type { OrganizationInvitationPayloadResolvers } from './../../../__generated__/types';

export const OrganizationInvitationPayload: OrganizationInvitationPayloadResolvers = {
  __isTypeOf: organization => {
    return !!organization.name;
  },
  name: organization => {
    return organization.name;
  },
};
