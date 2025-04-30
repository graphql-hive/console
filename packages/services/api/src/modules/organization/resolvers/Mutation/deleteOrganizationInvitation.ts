import { IdTranslator } from '../../../shared/providers/id-translator';
import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOrganizationInvitation: NonNullable<
  MutationResolvers['deleteOrganizationInvitation']
> = async (_, { input }, { injector }) => {
  const invitation = await injector
    .get(OrganizationManager)
    .deleteInvitation({ organization: input.organization, email: input.email });

  if (invitation) {
    return {
      ok: {
        deletedOrganizationInvitationId: invitation.id,
      },
    };
  }

  return {
    error: {
      message: 'Invitation not found',
    },
  };
};
