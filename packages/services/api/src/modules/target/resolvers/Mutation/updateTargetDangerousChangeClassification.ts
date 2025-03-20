import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetDangerousChangeClassification: NonNullable<
  MutationResolvers['updateTargetDangerousChangeClassification']
> = async (_, { input: { failDiffOnDangerousChange, target } }, { injector, session }) => {
  const translator = injector.get(IdTranslator);
  const selector = await translator.resolveTargetReference({ reference: target });

  if (!selector) {
    session.raise('target:modifySettings');
  }

  const { targetId, projectId, organizationId } = selector as NonNullable<typeof selector>;
  const targetManager = injector.get(TargetManager);
  await targetManager.updateTargetDangerousChangeClassification({
    failDiffOnDangerousChange,
    targetId,
    projectId,
    organizationId,
  });

  return {
    __typename: 'UpdateTargetDangerousChangeClassificationResult',
    ok: {
      __typename: 'UpdateTargetDangerousChangeClassificationOk',
      target: await targetManager.getTarget({
        organizationId,
        projectId,
        targetId,
      }),
    },
  };
};
