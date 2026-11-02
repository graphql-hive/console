import { Injectable, InjectionToken } from 'graphql-modules';

export const WEB_APP_URL = new InjectionToken<string>('WEB_APP_URL');
/** Hive release version, sent as the User-Agent of outbound webhook calls. */
export const RELEASE = new InjectionToken<string>('RELEASE');

@Injectable()
export class RateLimitConfig {
  constructor(
    public readonly config: null | {
      ipHeaderName: string;
      bypassKey: string | null;
    },
  ) {}
}
