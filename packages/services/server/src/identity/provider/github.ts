import { Oauth2Provider, Oauth2WrappedConfig } from './oauth2';

export interface GithubConfig extends Oauth2WrappedConfig {}

export function GithubProvider(config: GithubConfig) {
  return Oauth2Provider({
    ...config,
    type: 'github',
    endpoint: {
      authorization: 'https://github.com/login/oauth/authorize',
      token: 'https://github.com/login/oauth/access_token',
    },
  });
}
