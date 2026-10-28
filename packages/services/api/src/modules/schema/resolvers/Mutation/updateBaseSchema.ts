import { z } from 'zod';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const GraphQLSchemaStringModel = z.string().max(5_000_000).min(0);

export const updateBaseSchema: NonNullable<MutationResolvers['updateBaseSchema']> = async (
  _,
  { input },
  { injector },
) => {
  const UpdateBaseSchemaModel = z.object({
    newBase: GraphQLSchemaStringModel.nullish(),
  });

  const result = UpdateBaseSchemaModel.safeParse(input);

  if (!result.success) {
    return {
      error: {
        message:
          z.flattenError(result.error).fieldErrors?.newBase?.[0] ?? 'Please check your input.',
      },
    };
  }

  const schemaManager = injector.get(SchemaManager);
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId, targetId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);

  const selector = { organizationId, projectId, targetId };
  await schemaManager.updateBaseSchema(selector, input.newBase ? input.newBase : null);

  return {
    ok: {
      updatedTarget: await injector.get(TargetManager).getTarget({
        organizationId,
        projectId,
        targetId,
      }),
    },
  };
};
