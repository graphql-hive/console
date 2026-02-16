import { OrganizationManager } from '../../organization/providers/organization-manager';
import { APP_DEPLOYMENTS_ENABLED } from '../providers/app-deployments-enabled-token';
import { AppDeploymentsManager } from '../providers/app-deployments-manager';
import type { TargetResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TargetMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some senarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const Target: Pick<
  TargetResolvers,
  'activeAppDeployments' | 'appDeployment' | 'appDeployments' | 'viewerCanViewAppDeployments'
> = {
  /* Implement Target resolver logic here */
  appDeployment: async (target, args, { injector }) => {
    return injector.get(AppDeploymentsManager).getAppDeploymentForTarget(target, {
      name: args.appName,
      version: args.appVersion,
    });
  },
  appDeployments: async (target, args, { injector }) => {
    const sort = args.sort
      ? {
          field: args.sort.field as 'CREATED_AT' | 'ACTIVATED_AT' | 'LAST_USED',
          direction: args.sort.direction as 'ASC' | 'DESC',
        }
      : null;

    return injector.get(AppDeploymentsManager).getPaginatedAppDeploymentsForTarget(target, {
      cursor: args.after ?? null,
      first: args.first ?? null,
      sort,
    });
  },
  viewerCanViewAppDeployments: async (target, _arg, { injector }) => {
    const organization = await injector.get(OrganizationManager).getOrganization({
      organizationId: target.orgId,
    });

    if (
      organization.featureFlags.appDeployments === false &&
      injector.get<boolean>(APP_DEPLOYMENTS_ENABLED) === false
    ) {
      return false;
    }
    return true;
  },
  activeAppDeployments: async (target, args, { injector }) => {
    return injector.get(AppDeploymentsManager).getActiveAppDeploymentsForTarget(target, {
      cursor: args.after ?? null,
      first: args.first ?? null,
      filter: {
        name: args.filter.name ?? null,
        lastUsedBefore: args.filter.lastUsedBefore?.toISOString() ?? null,
        neverUsedAndCreatedBefore: args.filter.neverUsedAndCreatedBefore?.toISOString() ?? null,
      },
    });
  },
};
