import ThirdPartyEmailPasswordReact from 'supertokens-auth-react/recipe/thirdpartyemailpassword';
import SessionReact from 'supertokens-auth-react/recipe/session';
import Provider from 'supertokens-auth-react/lib/build/recipe/thirdparty/providers';
import { env } from '@/env/frontend';
import { appInfo } from './app-info';

export const frontendConfig = () => {
  const providers: Array<Provider> = [];

  if (env.auth.github === true) {
    providers.push(ThirdPartyEmailPasswordReact.Github.init());
  }
  if (env.auth.google === true) {
    providers.push(ThirdPartyEmailPasswordReact.Google.init());
  }

  return {
    appInfo: appInfo(),
    recipeList: [
      ThirdPartyEmailPasswordReact.init({
        signInAndUpFeature: {
          providers,
        },
        emailVerificationFeature: {
          mode: 'REQUIRED',
        },
      }),
      SessionReact.init(),
    ],
  };
};
