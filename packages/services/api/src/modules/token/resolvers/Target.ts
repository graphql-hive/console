import { TokenManager } from '../providers/token-manager';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<TargetResolvers, 'tokens'> = {
  tokens(target, _, { injector }) {
    return injector.get(TokenManager).getTokens({
      targetId: target.id,
      projectId: target.projectId,
      organizationId: target.orgId,
    });
  },
};
