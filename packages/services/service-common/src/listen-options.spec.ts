import { resolveServerListenOptions } from './listen-options';

describe('resolveServerListenOptions', () => {
  // eslint-disable-next-line no-restricted-syntax -- explicit IPv4 literal required for validation coverage
  const ipv4Host = '0.0.0.0';

  test('defaults to dual-stack host', () => {
    expect(resolveServerListenOptions({})).toEqual({
      host: '::',
      ipv6Only: false,
    });
  });

  test('supports ipv4-only host', () => {
    expect(
      resolveServerListenOptions({
        serverHost: ipv4Host,
        serverHostIpv6Only: '0',
      }),
    ).toEqual({
      host: ipv4Host,
      ipv6Only: false,
    });
  });

  test('supports ipv6-only wildcard host', () => {
    expect(
      resolveServerListenOptions({
        serverHost: '::',
        serverHostIpv6Only: '1',
      }),
    ).toEqual({
      host: '::',
      ipv6Only: true,
    });
  });

  test('rejects ipv6-only combined with an IPv4 literal host', () => {
    expect(() =>
      resolveServerListenOptions({
        serverHost: ipv4Host,
        serverHostIpv6Only: '1',
      }),
    ).toThrow(/SERVER_HOST_IPV6_ONLY=1 is incompatible with IPv4 host "0\.0\.0\.0"/);
  });
});
