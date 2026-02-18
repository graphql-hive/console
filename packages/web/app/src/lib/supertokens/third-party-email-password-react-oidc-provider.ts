import { UserInput } from 'supertokens-auth-react/lib/build/recipe/thirdpartyemailpassword/types';
import { getAuthorisationURLWithQueryParamsAndSetState } from 'supertokens-auth-react/recipe/thirdpartyemailpassword';
import { env } from '@/env/frontend';
import { updateLastAuthMethod } from './last-auth-method';

export const createThirdPartyEmailPasswordReactOIDCProvider = () => ({
  id: 'oidc',
  name: 'OIDC',
});

const delimiter = '--';

let currentAuthUrl: null | string = null;

export const getOIDCOverrides = (): UserInput['override'] => ({
  functions: originalImplementation => ({
    ...originalImplementation,
    generateStateToSendToOAuthProvider(input) {
      let state: null | string = null;
      if (currentAuthUrl) {
        const url = new URL(currentAuthUrl);

        state = url.searchParams.get('state');
      }

      state ||= originalImplementation.generateStateToSendToOAuthProvider(input);

      const oidcId = input?.userContext?.['oidcId'];

      if (typeof oidcId === 'string') {
        return `${state}${delimiter}${oidcId}`;
      }

      return state;
    },
    async getAuthorisationURLFromBackend(input) {
      const maybeId: unknown = input.userContext['oidcId'];

      const result = await originalImplementation.getAuthorisationURLFromBackend(
        typeof maybeId === 'string'
          ? {
              ...input,
              options: {
                preAPIHook: async options => {
                  const url = new URL(options.url);
                  url.searchParams.append('oidc_id', maybeId);
                  return {
                    ...options,
                    url: url.toString(),
                  };
                },
              },
            }
          : input,
      );

      currentAuthUrl = result.urlWithQueryParams;
      return result;
    },
    thirdPartySignInAndUp(input) {
      const locationUrl = new URL(window.location.toString());
      // TODO: maybe there is a better way than getting the state from the URL
      const [, oidcId] = locationUrl.searchParams.get('state')?.split(delimiter) ?? [];

      return originalImplementation.thirdPartySignInAndUp(
        typeof oidcId === 'string'
          ? {
              ...input,
              options: {
                preAPIHook: async options => {
                  const url = new URL(options.url);
                  url.searchParams.append('oidc_id', oidcId);
                  return {
                    ...options,
                    url: url.toString(),
                  };
                },
              },
            }
          : input,
      );
    },
  }),
});

export const startAuthFlowForOIDCProvider = async (oidcId: string) => {
  const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
    thirdPartyId: 'oidc',
    frontendRedirectURI: `${env.appBaseUrl}/auth/callback/oidc`,
    // The user context is very important - we store the OIDC ID so we can use it later on.
    userContext: {
      oidcId,
    },
  });

  updateLastAuthMethod('oidc');

  // Redirects to the OIDC provider
  window.location.assign(authUrl);
};
