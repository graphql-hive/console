import { Inject, Injectable, InjectionToken, Optional } from 'graphql-modules';
import type { EmailsApi } from '@hive/emails';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

export const EMAILS_ENDPOINT = new InjectionToken<string>('EMAILS_ENDPOINT');

@Injectable()
export class Emails {
  public api;

  constructor(@Optional() @Inject(EMAILS_ENDPOINT) endpoint?: string) {
    this.api = endpoint
      ? createTRPCProxyClient<EmailsApi>({
          links: [
            httpLink({
              url: `${endpoint}/trpc`,
              fetch,
            }),
          ],
        })
      : null;
  }
}
