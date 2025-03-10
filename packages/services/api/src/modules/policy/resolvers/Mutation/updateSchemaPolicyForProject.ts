import { TRPCClientError } from '@trpc/client';
import { ProjectManager } from '../../../project/providers/project-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPolicyApiProvider } from '../../providers/schema-policy-api.provider';
import { SchemaPolicyProvider } from '../../providers/schema-policy.provider';
import { formatTRPCErrors, policyInputToConfigObject } from '../../utils';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSchemaPolicyForProject: NonNullable<
  MutationResolvers['updateSchemaPolicyForProject']
> = async (_, { selector, policy }, { injector }) => {
  try {
    const translator = injector.get(IdTranslator);
    const [organization, project] = await Promise.all([
      translator.translateOrganizationId(selector),
      translator.translateProjectId(selector),
    ]);
    const organizationPolicy = await injector
      .get(SchemaPolicyProvider)
      .getOrganizationPolicy({ organizationId: organization });
    const allowOverrides = organizationPolicy === null || organizationPolicy.allowOverrides;

    if (!allowOverrides) {
      throw new Error(
        `Organization policy does not allow overrides for schema policy at the project level.`,
      );
    }

    const config = policyInputToConfigObject(policy);
    await injector.get(SchemaPolicyApiProvider).validateConfig({ config });
    const updatedPolicy = await injector
      .get(SchemaPolicyProvider)
      .setProjectPolicy({ organizationId: organization, projectId: project }, config);

    return {
      ok: {
        updatedPolicy,
        project: await injector
          .get(ProjectManager)
          .getProject({ organizationId: organization, projectId: project }),
      },
    };
  } catch (e) {
    if (e instanceof TRPCClientError) {
      return formatTRPCErrors(e);
    }

    return {
      error: {
        __typename: 'UpdateSchemaPolicyResultError',
        message: (e as Error).message,
      },
    };
  }
};
