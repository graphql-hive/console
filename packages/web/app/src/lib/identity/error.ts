/**
 * The given subject is invalid.
 */
export class InvalidSubjectError extends Error {
  constructor() {
    super('Invalid subject');
  }
}

/**
 * The given refresh token is invalid.
 */
export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}

/**
 * The given access token is invalid.
 */
export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Invalid access token');
  }
}

/**
 * The given authorization code is invalid.
 */
export class InvalidAuthorizationCodeError extends Error {
  constructor() {
    super('Invalid authorization code');
  }
}
