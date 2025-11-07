import { HiveError } from '../../../../shared/errors';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaManager } from '../../providers/schema-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSchemaComposition: NonNullable<
  MutationResolvers['updateSchemaComposition']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const commonInput = input.native ?? input.external ?? input.legacy;
  const [organization, project] = await Promise.all([
    translator.translateOrganizationId(commonInput),
    translator.translateProjectId(commonInput),
  ]);

  if (input.native) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: project,
      organizationId: organization,
      mode: 'native',
    });
  }
  if (input.legacy) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: project,
      organizationId: organization,
      mode: 'legacy',
    });
  }
  if (input.external) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: project,
      organizationId: organization,
      mode: 'external',
      endpoint: input.external.endpoint,
      secret: input.external.secret,
    });
  }

  const __: never = input;
  throw new HiveError('Unexpected input');
};
