import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const testDeliveryChannel: NonNullable<MutationResolvers['testDeliveryChannel']> = async (
  _,
  { input },
  { injector, req },
) => {
  const result = await injector.get(AlertsManager).testChannel(input, req);

  return result.delivered
    ? { ok: { idempotencyKey: result.idempotencyKey } }
    : { error: { message: result.message, idempotencyKey: result.idempotencyKey } };
};
