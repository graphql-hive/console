import { MutationResolvers } from '../../../../__generated__/types';
import { PreflightScriptProvider } from '../../providers/preflight-script.provider';

export const updatePreflightScript: NonNullable<MutationResolvers['updatePreflightScript']> = (
  _parent,
  { selector, input },
  { injector },
) => {
  return injector.get(PreflightScriptProvider).updatePreflightScript(selector, input);
};
