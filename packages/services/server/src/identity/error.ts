/**
 * The OAuth server returned an error.
 */
export class OauthError extends Error {
  constructor(
    public error:
      | 'invalid_request'
      | 'invalid_grant'
      | 'unauthorized_client'
      | 'access_denied'
      | 'unsupported_grant_type'
      | 'server_error'
      | 'temporarily_unavailable',
    public description: string,
  ) {
    super(error + ' - ' + description);
  }
}

/**
 * The browser was in an unknown state.
 *
 * This can happen when certain cookies have expired. Or the browser was switched in the middle
 * of the authentication flow.
 */
export class UnknownStateError extends Error {
  constructor() {
    super(
      'The browser was in an unknown state. This could be because certain cookies expired or the browser was switched in the middle of an authentication flow',
    );
  }
}

/**
 * The given client is not authorized to use the redirect URI that was passed in.
 */
export class UnauthorizedClientError extends OauthError {
  constructor(
    public clientID: string,
    redirectURI: string,
  ) {
    super(
      'unauthorized_client',
      `Client ${clientID} is not authorized to use this redirect_uri: ${redirectURI}`,
    );
  }
}
