import { SchemaPusher } from '../../providers/schema-pusher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaPush: NonNullable<MutationResolvers['schemaPush']> = async (
  _,
  { input },
  { injector },
) => injector.get(SchemaPusher).push(input);
