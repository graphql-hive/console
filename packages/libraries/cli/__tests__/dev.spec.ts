import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidRemoteCompositionResultError,
  RegistryApiError,
  RemoteCompositionError as CoreRemoteCompositionError,
  SupergraphCompositionError,
} from '@graphql-hive/core';
import {
  APIError,
  InvalidCompositionResultError,
  LocalCompositionError,
  RemoteCompositionError,
} from '../src/helpers/errors';

const mockComposeSupergraphLocally = vi.fn();
const mockComposeSupergraphRemotely = vi.fn();

vi.mock('@graphql-hive/core', async () => {
  const actual = await vi.importActual<typeof import('@graphql-hive/core')>('@graphql-hive/core');
  return {
    ...actual,
    composeSupergraphLocally: (...args: unknown[]) => mockComposeSupergraphLocally(...args),
    composeSupergraphRemotely: (...args: unknown[]) => mockComposeSupergraphRemotely(...args),
  };
});

const { default: Dev } = await import('../src/commands/dev');

function createDevInstance() {
  const dev = Object.create(Dev.prototype) as any;
  dev.logSuccess = vi.fn();
  dev.log = vi.fn();
  dev.logger = { info: vi.fn(), error: vi.fn(), debug: vi.fn() };
  dev.config = { version: '0.0.0' };
  return dev;
}

beforeEach(() => {
  mockComposeSupergraphLocally.mockReset();
  mockComposeSupergraphRemotely.mockReset();
});

describe('Dev.composeLocally', () => {
  it('maps a SupergraphCompositionError to a LocalCompositionError', async () => {
    const compositionResult = { errors: [{ message: 'field conflict' }] } as any;
    mockComposeSupergraphLocally.mockRejectedValue(
      new SupergraphCompositionError(compositionResult),
    );

    const dev = createDevInstance();
    const onError = vi.fn();

    await dev.composeLocally({ services: [], write: 'out.graphql', onError });

    expect(onError).toHaveBeenCalledWith(expect.any(LocalCompositionError));
  });

  it('rethrows unrecognized errors', async () => {
    mockComposeSupergraphLocally.mockRejectedValue(new Error('unexpected'));

    const dev = createDevInstance();
    const onError = vi.fn();

    await expect(
      dev.composeLocally({ services: [], write: 'out.graphql', onError }),
    ).rejects.toThrow('unexpected');
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('Dev.compose', () => {
  const baseInput = {
    services: [],
    registry: 'http://registry.localhost',
    token: 'secret-token',
    write: 'out.graphql',
    unstable__forceLatest: false,
    target: null,
  };

  it('maps a RegistryApiError to an APIError', async () => {
    mockComposeSupergraphRemotely.mockRejectedValue(new RegistryApiError('bad request'));

    const dev = createDevInstance();
    const onError = vi.fn();

    await dev.compose({ ...baseInput, onError });

    expect(onError).toHaveBeenCalledWith(expect.any(APIError));
  });

  it('maps a core RemoteCompositionError to the CLI RemoteCompositionError', async () => {
    mockComposeSupergraphRemotely.mockRejectedValue(
      new CoreRemoteCompositionError([{ message: 'field conflict' }]),
    );

    const dev = createDevInstance();
    const onError = vi.fn();

    await dev.compose({ ...baseInput, onError });

    expect(onError).toHaveBeenCalledWith(expect.any(RemoteCompositionError));
  });

  it('maps an InvalidRemoteCompositionResultError to an InvalidCompositionResultError', async () => {
    mockComposeSupergraphRemotely.mockRejectedValue(new InvalidRemoteCompositionResultError(null));

    const dev = createDevInstance();
    const onError = vi.fn();

    await dev.compose({ ...baseInput, onError });

    expect(onError).toHaveBeenCalledWith(expect.any(InvalidCompositionResultError));
  });

  it('rethrows unrecognized errors', async () => {
    mockComposeSupergraphRemotely.mockRejectedValue(new Error('network down'));

    const dev = createDevInstance();
    const onError = vi.fn();

    await expect(dev.compose({ ...baseInput, onError })).rejects.toThrow('network down');
    expect(onError).not.toHaveBeenCalled();
  });
});
