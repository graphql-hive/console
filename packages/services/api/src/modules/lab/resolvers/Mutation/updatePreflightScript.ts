import { MutationResolvers } from '../../../../__generated__/types';
import { PreflightScriptProvider } from '../../providers/preflight-script.provider';

export const updatePreflightScript: NonNullable<
  MutationResolvers['updatePreflightScript']
> = async (_parent, args, { injector }) => {
  const result = await injector.get(PreflightScriptProvider).updatePreflightScript({
    selector: args.input.selector,
    sourceCode: args.input.sourceCode,
  });

  if (result.error) {
    return {
      error: result.error,
      ok: null,
    };
  }

  return {
    ok: result.ok,
    error: null,
  };
};
