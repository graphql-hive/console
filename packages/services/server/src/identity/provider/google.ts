import { Oauth2Provider, Oauth2WrappedConfig } from './oauth2';

export interface GoogleConfig extends Oauth2WrappedConfig {}

export function GoogleProvider(config: GoogleConfig) {
  return Oauth2Provider({
    ...config,
    type: 'google',
    endpoint: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
  });
}
