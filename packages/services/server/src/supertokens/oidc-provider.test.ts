import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { describeOIDCSignInError, exchangeAuthCodeWithFederatedIdentity } from './oidc-provider';

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

describe('exchangeAuthCodeWithFederatedIdentity', () => {
  const mockConfig = {
    id: 'test-oidc-id',
    clientId: 'test-client-id',
    clientSecret: null,
    tokenEndpoint: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
    userinfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
    authorizationEndpoint: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize',
    additionalScopes: [],
    useFederatedIdentity: true,
  };

  const mockInput = {
    redirectURIInfo: {
      redirectURIOnProviderDashboard: 'https://example.com/auth/callback/oidc',
      redirectURIQueryParams: { code: 'auth-code-123' },
    },
  };

  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  } as any;

  test('successfully exchanges auth code using a federated token file', async () => {
    const tokenFile = join(tmpdir(), `test-azure-token-${Date.now()}.txt`);
    await writeFile(tokenFile, '  eyJhbGciOiJSUzI1NiJ9.test-service-account-token  ');

    const mockResponse = { access_token: 'ya29.mock-access-token', token_type: 'Bearer' };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await exchangeAuthCodeWithFederatedIdentity(
      mockConfig,
      mockInput,
      mockLogger,
      tokenFile,
    );

    expect(result).toEqual(mockResponse);

    // Verify the correct parameters were sent to the token endpoint
    const fetchCall = (global.fetch as ReturnType<typeof vi.spyOn>).mock.calls[0];
    expect(fetchCall[0]).toBe(mockConfig.tokenEndpoint);
    const body = new URLSearchParams((fetchCall[1] as RequestInit).body as string);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('test-client-id');
    expect(body.get('code')).toBe('auth-code-123');
    expect(body.get('client_assertion_type')).toBe(
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    );
    expect(body.get('client_assertion')).toBe('eyJhbGciOiJSUzI1NiJ9.test-service-account-token');
    expect(body.has('client_secret')).toBe(false);

    vi.restoreAllMocks();
  });

  test('throws a descriptive error when the federated token file does not exist', async () => {
    await expect(
      exchangeAuthCodeWithFederatedIdentity(
        mockConfig,
        mockInput,
        mockLogger,
        '/nonexistent/path/to/azure-token',
      ),
    ).rejects.toThrow('Failed to read Azure federated identity token from');
  });

  test('throws on non-200 response from token endpoint', async () => {
    const tokenFile = join(tmpdir(), `test-azure-token-error-${Date.now()}.txt`);
    await writeFile(tokenFile, 'test-token');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '{"error":"invalid_client"}',
    } as Response);

    await expect(
      exchangeAuthCodeWithFederatedIdentity(mockConfig, mockInput, mockLogger, tokenFile),
    ).rejects.toThrow('Received response with status 401');

    vi.restoreAllMocks();
  });

  test('throws on non-JSON response from token endpoint', async () => {
    const tokenFile = join(tmpdir(), `test-azure-token-json-${Date.now()}.txt`);
    await writeFile(tokenFile, 'test-token');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'not valid json',
    } as Response);

    await expect(
      exchangeAuthCodeWithFederatedIdentity(mockConfig, mockInput, mockLogger, tokenFile),
    ).rejects.toThrow('Could not parse JSON response from token endpoint.');

    vi.restoreAllMocks();
  });
});
