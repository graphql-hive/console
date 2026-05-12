const IPV4_LITERAL = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function resolveServerListenOptions(input: {
  serverHost?: string;
  serverHostIpv6Only?: '0' | '1';
}) {
  const host = input.serverHost ?? '::';
  const ipv6Only = input.serverHostIpv6Only === '1';

  if (ipv6Only && IPV4_LITERAL.test(host)) {
    throw new Error(
      `Invalid listen options: SERVER_HOST_IPV6_ONLY=1 is incompatible with IPv4 host "${host}".`,
    );
  }

  return { host, ipv6Only } as const;
}
