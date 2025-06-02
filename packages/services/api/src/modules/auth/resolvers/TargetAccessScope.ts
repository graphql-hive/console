import { TargetAccessScope as TargetAccessScopeEnum } from '../providers/scopes';
import type { TargetAccessScopeResolvers } from './../../../__generated__/types';

export const TargetAccessScope: TargetAccessScopeResolvers = {
  READ: TargetAccessScopeEnum.READ,
  REGISTRY_READ: TargetAccessScopeEnum.REGISTRY_READ,
  REGISTRY_WRITE: TargetAccessScopeEnum.REGISTRY_WRITE,
  DELETE: TargetAccessScopeEnum.DELETE,
  SETTINGS: TargetAccessScopeEnum.SETTINGS,
  TOKENS_READ: TargetAccessScopeEnum.TOKENS_READ,
  TOKENS_WRITE: TargetAccessScopeEnum.TOKENS_WRITE,
};
