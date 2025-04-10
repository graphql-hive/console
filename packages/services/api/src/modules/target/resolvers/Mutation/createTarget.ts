import { z } from 'zod';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import { TargetSlugModel } from '../../validation';
import type { MutationResolvers } from './../../../../__generated__/types';

const CreateTargetModel = z.object({
  slug: TargetSlugModel,
});

export const createTarget: NonNullable<MutationResolvers['createTarget']> = async (
  _,
  { input },
  { injector },
) => {
  const inputParseResult = CreateTargetModel.safeParse(input);
  if (!inputParseResult.success) {
    return {
      error: {
        message: 'Check your input.',
        inputErrors: {
          slug: inputParseResult.error.formErrors.fieldErrors.slug?.[0],
        },
      },
    };
  }

  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId({
      organizationSlug: input.organizationSlug,
    }),
    translator.translateProjectId({
      organizationSlug: input.organizationSlug,
      projectSlug: input.projectSlug,
    }),
  ]);
  const result = await injector.get(TargetManager).createTarget({
    organizationId: organizationId,
    projectId: projectId,
    slug: inputParseResult.data.slug,
  });

  if (result.ok) {
    return {
      ok: {
        selector: {
          organizationSlug: input.organizationSlug,
          projectSlug: input.projectSlug,
          targetSlug: result.target.slug,
        },
        createdTarget: result.target,
      },
    };
  }

  return {
    ok: null,
    error: {
      message: result.message,
      inputErrors: {},
    },
  };
};
