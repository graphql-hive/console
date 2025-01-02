import { Session } from '../../lib/authz';
import type { QueryResolvers } from './../../../../__generated__/types';

export const me: NonNullable<QueryResolvers['me']> = (_, __, { injector }) => {
  return injector.get(Session).getViewer();
};
