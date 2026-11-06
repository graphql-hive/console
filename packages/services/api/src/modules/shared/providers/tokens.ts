import { Injectable, InjectionToken } from 'graphql-modules';

export const WEB_APP_URL = new InjectionToken<string>('WEB_APP_URL');

/**
 * Name of the header containing the IP address of the client, set by the CDN/proxy in front of the server.
 * Empty if the IP address of the request should be used.
 */
export class ClientIPHeaderName {
  constructor(readonly headerName: string | null) {}
}

@Injectable()
export class RateLimitConfig {
  constructor(
    public readonly config: null | {
      bypassKey: string | null;
    },
  ) {}
}
