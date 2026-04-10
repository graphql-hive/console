import { Injectable, InjectionToken } from 'graphql-modules';

export const WEB_APP_URL = new InjectionToken<string>('WEB_APP_URL');

@Injectable()
export class RateLimitConfig {
  constructor(
    public readonly config: null | {
      ipHeaderName: string;
      bypassKey: string | null;
    },
  ) {}
}
