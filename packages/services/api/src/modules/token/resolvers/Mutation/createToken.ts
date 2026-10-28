import { z } from 'zod';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TokenManager } from '../../providers/token-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const TokenNameModel = z.string().min(2, 'Name must contain at least 2 characters').max(50);

const CreateTokenInputModel = z.object({
  name: TokenNameModel,
});

export const createToken: NonNullable<MutationResolvers['createToken']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = CreateTokenInputModel.safeParse(input);

  if (!result.success) {
    return {
      error: {
        message: z.flattenError(result.error).fieldErrors.name?.[0] ?? 'Please check your input.',
      },
    };
  }

  const translator = injector.get(IdTranslator);
  const [organization, project, target] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);
  const token = await injector.get(TokenManager).createToken({
    name: input.name,
    targetId: target,
    projectId: project,
    organizationId: organization,
    organizationScopes: input.organizationScopes,
    projectScopes: input.projectScopes,
    targetScopes: input.targetScopes,
  });

  return {
    ok: {
      selector: {
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        targetSlug: input.targetSlug,
      },
      createdToken: token,
      secret: token.secret,
    },
  };
};
