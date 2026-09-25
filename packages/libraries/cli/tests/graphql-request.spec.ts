import { parse } from 'graphql';
import { http, HTTPResponseError } from '@graphql-hive/core';
import {
  AccessDeniedError,
  APIError,
  HTTPError,
  InvalidRegistryTokenError,
  MissingArgumentsError,
  NetworkError,
  RequestTimeoutError,
  UnsupportedServerError,
} from '../src/helpers/errors';
import { graphqlRequest } from '../src/helpers/graphql-request';

vi.mock('@graphql-hive/core', async importOriginal => {
  const original = await importOriginal<typeof import('@graphql-hive/core')>();
  return {
    ...original,
    http: { ...original.http, post: vi.fn() },
  };
});

const post = vi.mocked(http.post);
const endpoint = 'https://registry.example.com/graphql';
const operation = parse('query { __typename }');

function respondWithErrors(errors: Array<{ message: string; extensions?: object }>) {
  post.mockResolvedValue(
    new Response(JSON.stringify({ errors }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': 'request-id' },
    }),
  );
}

async function requestError(isHiveRegistry: boolean) {
  return graphqlRequest({ endpoint, isHiveRegistry })
    .request({ operation } as any)
    .then(
      () => null,
      error => error,
    );
}

beforeEach(() => {
  post.mockReset();
});

describe('registry errors', () => {
  test('UNAUTHORISED with a missing permission is an access denied error naming the permission', async () => {
    respondWithErrors([
      {
        message: `No access (reason: "Missing permission for performing 'schema:push' on resource")`,
        extensions: { code: 'UNAUTHORISED' },
      },
    ]);

    const error = await requestError(true);
    expect(error).toBeInstanceOf(AccessDeniedError);
    expect(error.permission).toBe('schema:push');
    expect(error.errorCode).toBe(124);
    expect(error.message).toContain('"schema:push" permission');
    expect(error.message).toContain('Request ID: "request-id"');
  });

  test('UNAUTHORISED without a permission keeps the server reason', async () => {
    respondWithErrors([
      {
        message: 'No access (reason: "Authorization header is missing")',
        extensions: { code: 'UNAUTHORISED' },
      },
    ]);

    const error = await requestError(true);
    expect(error).toBeInstanceOf(AccessDeniedError);
    expect(error.permission).toBe(null);
    expect(error.message).toContain('Authorization header is missing');
  });

  test.each([
    { message: 'Invalid token provided' },
    { message: 'Invalid session.', extensions: { code: 'UNAUTHENTICATED' } },
    { message: 'Expired session.', extensions: { code: 'NEEDS_REFRESH' } },
  ])('authentication failure "$message" is an invalid token error', async graphQLError => {
    respondWithErrors([graphQLError]);
    expect(await requestError(true)).toBeInstanceOf(InvalidRegistryTokenError);
  });

  test('ERR_MISSING_TARGET is a missing argument error', async () => {
    respondWithErrors([
      { message: 'No target was provided.', extensions: { code: 'ERR_MISSING_TARGET' } },
    ]);
    expect(await requestError(true)).toBeInstanceOf(MissingArgumentsError);
  });

  test.each([
    'Cannot query field "valid" on type "GitHubSchemaCheckSuccess".',
    'Variable "$input" got invalid value { sdl: "type Query" }; Field "baseline" is not defined by type "SchemaCheckInput".',
    'Unknown argument "withSafeBasedOnUsageNote" on field "SchemaChange.message".',
  ])('validation error "%s" means the server is older than the CLI', async message => {
    respondWithErrors([{ message }]);
    const error = await requestError(true);
    expect(error).toBeInstanceOf(UnsupportedServerError);
    expect(error.errorCode).toBe(125);
  });

  test('other validation errors stay API errors', async () => {
    respondWithErrors([
      { message: 'Cannot query field "valid" on type "GitHubSchemaCheckSuccess".' },
      { message: 'Something else went wrong.' },
    ]);
    expect(await requestError(true)).toBeInstanceOf(APIError);
  });

  test('other GraphQL errors are API errors', async () => {
    respondWithErrors([{ message: 'Unexpected error.' }]);
    const error = await requestError(true);
    expect(error).toBeInstanceOf(APIError);
    expect(error.errorCode).toBe(115);
  });
});

describe('non-registry requests', () => {
  test('registry specific codes are not applied', async () => {
    respondWithErrors([
      {
        message: `No access (reason: "Missing permission for performing 'x' on resource")`,
        extensions: { code: 'UNAUTHORISED' },
      },
    ]);
    expect(await requestError(false)).toBeInstanceOf(APIError);
  });

  test('a timeout is a network error', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    post.mockRejectedValue(new Error('Unexpected HTTP error.', { cause: timeout }));

    const error = await requestError(false);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect(error.exitCode).toBe(1);
  });
});

describe('transport errors', () => {
  test('a timeout is a request timeout error', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    post.mockRejectedValue(new Error('Unexpected HTTP error.', { cause: timeout }));

    const error = await requestError(true);
    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.exitCode).toBe(2);
  });

  test('a rejected status code is an HTTP error', async () => {
    post.mockRejectedValue(new HTTPResponseError('failed with status 502.', 502, 'Bad Gateway'));

    const error = await requestError(true);
    expect(error).toBeInstanceOf(HTTPError);
    expect(error.message).toContain('Status: 502');
  });

  test('a connection failure is a network error', async () => {
    post.mockRejectedValue(
      new Error('Unexpected HTTP error.', { cause: new Error('getaddrinfo ENOTFOUND') }),
    );

    const error = await requestError(true);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect(error.errorCode).toBe(114);
  });
});
