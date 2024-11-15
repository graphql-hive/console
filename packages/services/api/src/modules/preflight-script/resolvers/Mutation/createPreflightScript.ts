import { MutationResolvers } from '../../../../__generated__/types';
import { PreflightScriptProvider } from '../../providers/preflight-script.provider';

export const createPreflightScript: NonNullable<MutationResolvers['createPreflightScript']> = (
  _parent,
  { selector, input },
  { injector },
) => {
  return injector.get(PreflightScriptProvider).createPreflightScript(selector, input);
};
