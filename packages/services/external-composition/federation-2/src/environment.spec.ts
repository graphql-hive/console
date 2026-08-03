import { resolveEnv } from './environment';

describe('resolveEnv', () => {
  // eslint-disable-next-line no-restricted-syntax -- explicit IPv4 literal required for validation coverage
  const ipv4Host = '0.0.0.0';

  test('uses host and ipv6 defaults when not provided', () => {
    const env = resolveEnv({
      SECRET: 'secretsecret',
    });

    expect(env.http).toEqual({
      port: 3069,
      host: '::',
      ipv6Only: false,
    });
  });

  test('honors explicit host and ipv6-only values', () => {
    const env = resolveEnv({
      SECRET: 'secretsecret',
      PORT: '4000',
      SERVER_HOST: '::1',
      SERVER_HOST_IPV6_ONLY: '1',
    });

    expect(env.http).toEqual({
      port: 4000,
      host: '::1',
      ipv6Only: true,
    });
  });

  test('rejects ipv6-only combined with an IPv4 literal host', () => {
    expect(() =>
      resolveEnv({
        SECRET: 'secretsecret',
        SERVER_HOST: ipv4Host,
        SERVER_HOST_IPV6_ONLY: '1',
      }),
    ).toThrow(/SERVER_HOST_IPV6_ONLY=1 is incompatible with IPv4 host "0\.0\.0\.0"/);
  });
});
