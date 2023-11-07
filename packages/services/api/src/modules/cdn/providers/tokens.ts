import { InjectionToken } from 'graphql-modules';

export interface CDNConfig {
  /** Available providers for serving the CDN. */
  providers: {
    cloudflare: {
      baseUrl: string;
    } | null;
    api: {
      baseUrl: string;
    } | null;
  };
}

export const CDN_CONFIG = new InjectionToken<CDNConfig>('cdn-config');
