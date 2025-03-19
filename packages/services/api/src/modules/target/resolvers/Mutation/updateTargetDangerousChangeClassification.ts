import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetDangerousChangeClassification: NonNullable<
  MutationResolvers['updateTargetDangerousChangeClassification']
> = async (_, { input: { considerDangerousToBeBreaking, target: targetRef } }, { injector }) => {
  const targetManager = injector.get(TargetManager);
  let targetId: string, projectId: string, organizationId: string;
  if (targetRef.byId) {
    const target = await targetManager.getTargetById({ targetId: targetRef.byId });
    targetId = target.id;
    projectId = target.projectId;
    organizationId = target.orgId;
  } else if (targetRef.bySelector) {
    const translator = injector.get(IdTranslator);
    [organizationId, projectId, targetId] = await Promise.all([
      translator.translateOrganizationId(targetRef.bySelector),
      translator.translateProjectId(targetRef.bySelector),
      translator.translateTargetId(targetRef.bySelector),
    ]);
  } else {
    throw new Error();
  }

  await targetManager.updateTargetDangerousChangeClassification({
    considerDangerousToBeBreaking,
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
