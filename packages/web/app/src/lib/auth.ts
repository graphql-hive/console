import { genericOAuthClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { BetterAuthClientPlugin } from 'better-auth/types';
import type { sso } from 'packages/services/server/src/auth/sso';
import { env } from '@/env/frontend';
import { captureException } from '@sentry/react';

type ProviderId = 'google' | 'okta' | 'github' | 'oidc';
const providers: ProviderId[] = ['google', 'okta', 'github', 'oidc'];

export const enabledProviders: ProviderId[] = providers.filter(
  provider => env.auth[provider] === true,
);

export function isProviderEnabled(provider: ProviderId) {
  return enabledProviders.includes(provider);
}

export function createCallbackURL(path: string) {
  return env.appBaseUrl + (path.startsWith('/') ? path : '/' + path);
}

const ssoClient = () => {
  return {
    id: 'sso-client',
    $InferServerPlugin: {} as ReturnType<typeof sso>,
  } satisfies BetterAuthClientPlugin;
};

export const authClient = createAuthClient({
  baseURL: env.graphqlPublicOrigin + '/auth-api',
  plugins: [ssoClient(), genericOAuthClient()],
});

type ErrorTypes = Record<keyof typeof authClient.$ERROR_CODES, string>;

export const errorCodes: ErrorTypes = {
  USER_ALREADY_EXISTS: 'An account with this email already exists. Try logging in instead.',
  USER_NOT_FOUND: "We couldn't find an account with this email. Please check and try again.",
  INVALID_PASSWORD: "Oops! That password doesn't match our records. Try again.",
  USER_EMAIL_NOT_FOUND: "We couldn't find an account with this email. Try signing up instead.",
  FAILED_TO_CREATE_USER: 'Something went wrong while creating your account. Please try again.',
  FAILED_TO_CREATE_SESSION: 'We ran into a problem starting your session. Try again later.',
  FAILED_TO_UPDATE_USER: "We couldn't update your account details. Please try again.",
  FAILED_TO_GET_SESSION: "Your session couldn't be retrieved. Please log in again.",
  INVALID_EMAIL: "Hmm... that doesn't look like a valid email. Please check and try again.",
  INVALID_EMAIL_OR_PASSWORD: 'Your email or password is incorrect. Please check and try again.',
  SOCIAL_ACCOUNT_ALREADY_LINKED: 'This social account is already connected to another account.',
  PROVIDER_NOT_FOUND: "The authentication provider wasn't found. Please try again.",
  INVALID_TOKEN: 'Your session has expired or is invalid. Please log in again.',
  ID_TOKEN_NOT_SUPPORTED: 'This login method is not supported. Please use a different method.',
  FAILED_TO_GET_USER_INFO: "We couldn't retrieve your profile information. Try again later.",
  EMAIL_NOT_VERIFIED: 'Please verify your email before proceeding.',
  PASSWORD_TOO_SHORT: 'Your password is too short. Please use at least 8 characters.',
  PASSWORD_TOO_LONG: 'Your password is too long. Please use a shorter password.',
  EMAIL_CAN_NOT_BE_UPDATED: "Sorry, you can't update your email at this time.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "We couldn't find an account linked to these credentials.",
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't unlink your last authentication method.",
  ACCOUNT_NOT_FOUND: "We couldn't find your account. Try signing up instead.",
};

type BetterAuthApiError = {
  code?: string | undefined;
  message?: string | undefined;
  status: number;
  statusText: string;
};

export class AuthError extends Error {
  code?: string;
  originalMessage?: string;
  status: number;
  statusText: string;

  constructor(error: BetterAuthApiError) {
    const message = getErrorMessage(error);
    super(message);
    this.name = 'AuthError';
    this.code = error.code;
    this.originalMessage = error.message;
    this.status = error.status;
    this.statusText = error.statusText;
  }
}

export function translateErrorCode(code?: string) {
  if (!!code && code in errorCodes) {
    return errorCodes[code as keyof typeof errorCodes];
  }

  return;
}

export function getErrorMessage(error: BetterAuthApiError) {
  const message = translateErrorCode(error.code) ?? error.message;

  if (message) {
    return message;
  }

  captureException(error);

  return 'An error occurred. Please try again later.';
}
