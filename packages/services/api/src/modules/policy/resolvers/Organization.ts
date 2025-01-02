import { SchemaPolicyProvider } from '../providers/schema-policy.provider';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  'schemaPolicy' | 'viewerCanModifySchemaPolicy' | '__isTypeOf'
> = {
  schemaPolicy: async (org, _, { injector }) =>
    injector.get(SchemaPolicyProvider).getOrganizationPolicy({
      organizationId: org.id,
    }),
  viewerCanModifySchemaPolicy: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'schemaLinting:modifyOrganizationRules',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
};
