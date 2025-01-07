import { BreakingChangeFormula } from 'packages/libraries/core/src/client/__generated__/types';
import { z } from 'zod';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import { PercentageModel } from '../../validation';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetValidationSettings: NonNullable<
  MutationResolvers['updateTargetValidationSettings']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organization, project, target] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);

  const org = await injector
    .get(OrganizationManager)
    .getOrganization({ organizationId: organization });

  const UpdateTargetValidationSettingsModel = z.object({
    percentage: PercentageModel,
    period: z.number().min(1).max(org.monthlyRateLimit.retentionInDays).int(),
    targetIds: z.array(z.string()).min(1),
    excludedClients: z.optional(z.array(z.string())),
    requestCount: z.number().min(1),
    breakingChangeFormula: z.enum(Object.values(BreakingChangeFormula) as [string, ...string[]]),
  });

  const result = UpdateTargetValidationSettingsModel.safeParse(input);

  if (!result.success) {
    return {
      error: {
        message: 'Please check your input.',
        inputErrors: {
          percentage: result.error.formErrors.fieldErrors.percentage?.[0],
          period: result.error.formErrors.fieldErrors.period?.[0],
          requestCount: result.error.formErrors.fieldErrors.requestCount?.[0],
        },
      },
    };
  }

  const targetManager = injector.get(TargetManager);
  await targetManager.updateTargetValidationSettings({
    period: input.period,
    percentage: input.percentage,
    requestCount: input.requestCount ?? 1,
    breakingChangeFormula: input.breakingChangeFormula ?? BreakingChangeFormula.Percentage,
    targetId: target,
    projectId: project,
    organizationId: organization,
    targets: result.data.targetIds,
    excludedClients: result.data.excludedClients ?? [],
  });

  return {
    ok: {
      target: await targetManager.getTarget({
        organizationId: organization,
        projectId: project,
        targetId: target,
      }),
    },
  };
};
