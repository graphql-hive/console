import { IdTranslator } from '../../../shared/providers/id-translator';
import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const testNewDeliveryChannel: NonNullable<
  MutationResolvers['testNewDeliveryChannel']
> = async (_, { input }, { injector, req, session }) => {
  const project = await injector
    .get(IdTranslator)
    .resolveProjectReference({ reference: input.project });
  if (project === null) {
    return session.raise('alert:modify');
  }

  const result = await injector
    .get(AlertsManager)
    .testNewChannel({ ...project, type: input.type, destination: input.destination }, req);

  return result.delivered
    ? { ok: { idempotencyKey: result.idempotencyKey } }
    : { error: { message: result.message, idempotencyKey: result.idempotencyKey } };
};
