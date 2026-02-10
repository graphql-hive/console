import { describe, expect, test } from 'vitest';
import { describeOIDCSignInError } from './oidc-provider';

describe('describeOIDCSignInError', () => {
  test('invalid_client error (e.g. expired client secret)', () => {
    const error = new Error(
      'Received response with status 401 and body {"error":"invalid_client","error_description":"AAD2SKSASFSLKAF: The provided client secret keys for app \'369sdsds1-8513-4ssa-ae64-292942jsjs\' are expired."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('invalid client credentials');
    expect(message).toContain('client secret has expired');
    expect(message).not.toContain('AAD2SKSASFSLKAF');
    expect(message).not.toContain('369sdsds1-8513-4ssa-ae64-292942jsjs');
  });

  test('invalid_grant error (e.g. expired authorization code)', () => {
    const error = new Error(
      'Received response with status 400 and body {"error":"invalid_grant","error_description":"The authorization code has expired."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('authorization code has expired');
    expect(message).toContain('try signing in again');
  });

  test('unauthorized_client error', () => {
    const error = new Error(
      'Received response with status 403 and body {"error":"unauthorized_client","error_description":"The client is not authorized."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('rejected the client authorization');
    expect(message).toContain('OIDC integration configuration');
  });

  test('invalid_request error', () => {
    const error = new Error(
      'Received response with status 400 and body {"error":"invalid_request","error_description":"The request is missing a required parameter."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('rejected the token request as malformed');
    expect(message).toContain('token endpoint URL');
  });

  test('unsupported_grant_type error', () => {
    const error = new Error(
      'Received response with status 400 and body {"error":"unsupported_grant_type","error_description":"The authorization grant type is not supported."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('does not support the authorization code grant type');
  });

  test('invalid_scope error', () => {
    const error = new Error(
      'Received response with status 400 and body {"error":"invalid_scope","error_description":"The requested scope is invalid."}',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('rejected the requested scopes');
    expect(message).toContain('additional scopes');
  });

  test('network error: ECONNREFUSED', () => {
    const error = new Error(
      'request to https://login.example.com/token failed, reason: connect ECONNREFUSED 127.0.0.1:443',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('Could not connect');
    expect(message).toContain('endpoint URLs');
  });

  test('network error: ENOTFOUND', () => {
    const error = new Error(
      'request to https://nonexistent.example.com/token failed, reason: getaddrinfo ENOTFOUND nonexistent.example.com',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('Could not connect');
  });

  test('network error: ETIMEDOUT', () => {
    const error = new Error(
      'request to https://slow.example.com/token failed, reason: connect ETIMEDOUT',
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('Could not connect');
  });

  test('network error: fetch failed', () => {
    const error = new TypeError('fetch failed');
    const message = describeOIDCSignInError(error);
    expect(message).toContain('Could not connect');
  });

  test('OIDC integration not found', () => {
    const error = new Error('Could not find OIDC integration.');
    const message = describeOIDCSignInError(error);
    expect(message).toContain('could not be found');
    expect(message).toContain('contact your organization administrator');
  });

  test('userinfo endpoint returned non-200 status', () => {
    const error = new Error(
      "Received invalid status code. Could not retrieve user's profile info.",
    );
    const message = describeOIDCSignInError(error);
    expect(message).toContain('user info endpoint returned an error');
    expect(message).toContain('verify the user info endpoint URL');
  });

  test('userinfo endpoint returned non-JSON response', () => {
    const error = new Error('Could not parse JSON response.');
    const message = describeOIDCSignInError(error);
    expect(message).toContain('returned an invalid response');
    expect(message).toContain('verify the user info endpoint URL');
  });

  test('userinfo endpoint missing required fields (sub, email)', () => {
    const error = new Error('Could not parse profile info.');
    const message = describeOIDCSignInError(error);
    expect(message).toContain('did not return the required fields');
    expect(message).toContain('sub, email');
  });

  test('unknown error returns generic message', () => {
    const error = new Error('Something completely unexpected happened');
    const message = describeOIDCSignInError(error);
    expect(message).toContain('unexpected error');
    expect(message).toContain('verify your OIDC integration configuration');
  });

  test('non-Error value is handled', () => {
    const message = describeOIDCSignInError('string error with invalid_client');
    expect(message).toContain('invalid client credentials');
  });

  test('no sensitive information is leaked in any branch', () => {
    const sensitiveError = new Error(
      'Received response with status 401 and body {"error":"invalid_client","error_description":"AADAASJAD213122: The provided client secret keys for app \'3693bbf1-8513-4cda-ae64-77e3ca237f17\' are expired. Visit the Azure portal to create new keys for your app: https://aka.ms/NewClientSecret Trace ID: b8b7152f-4489-46ed-8b78-11ad45520300 Correlation ID: 45c48f07-0191-431d-8a19-ba8319a7cd18"}',
    );
    const message = describeOIDCSignInError(sensitiveError);
    expect(message).not.toContain('3693bbf1');
    expect(message).not.toContain('b8b7152f');
    expect(message).not.toContain('45c48f07');
    expect(message).not.toContain('aka.ms');
    expect(message).not.toContain('Trace ID');
    expect(message).not.toContain('Correlation ID');
  });
});
