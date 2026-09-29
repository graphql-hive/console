import { createClient as createSSEClient } from 'graphql-sse';
import Session from 'supertokens-auth-react/recipe/session';
import { createClient, fetchExchange, mapExchange, subscriptionExchange } from 'urql';
import { env } from '@/env/frontend';
import { authExchange } from '@urql/exchange-auth';
import { cacheExchange } from '@urql/exchange-graphcache';
import { cacheOptions } from './urql-cache';
import { networkStatusExchange } from './urql-exchanges/state';

const isSome = <T>(value: T | null | undefined): value is T => value != null;

const sseClient = createSSEClient({
  url: env.graphqlPublicSubscriptionEndpoint,
  credentials: 'include',
});

export const urqlClient = createClient({
  url: env.graphqlPublicEndpoint,
  // @urql/core 6 sends small queries as GET by default; the API is called with POST only.
  preferGetMethod: false,
  fetchOptions: {
    headers: {
      'graphql-client-name': 'hive-app',
      'graphql-client-version': env.release,
    },
  },
  exchanges: [
    cacheExchange(cacheOptions),
    networkStatusExchange,
    authExchange(async () => {
      let action:
        | { type: 'NEEDS_REFRESH' | 'VERIFY_EMAIL' | 'UNAUTHENTICATED' }
        | { type: 'NEEDS_OIDC'; organizationSlug: string; oidcIntegrationId: string } = {
        type: 'UNAUTHENTICATED',
      };

      return {
        addAuthToOperation(operation) {
          return operation;
        },
        willAuthError() {
          return false;
        },
        didAuthError(error) {
          if (error.graphQLErrors.some(e => e.extensions?.code === 'UNAUTHENTICATED')) {
            action = { type: 'UNAUTHENTICATED' };
            return true;
          }

          if (error.graphQLErrors.some(e => e.extensions?.code === 'VERIFY_EMAIL')) {
            action = { type: 'VERIFY_EMAIL' };
            return true;
          }

          if (error.graphQLErrors.some(e => e.extensions?.code === 'NEEDS_REFRESH')) {
            action = { type: 'NEEDS_REFRESH' };
            return true;
          }

          const oidcError = error.graphQLErrors.find(e => e.extensions?.code === 'NEEDS_OIDC');
          if (oidcError) {
            action = {
              type: 'NEEDS_OIDC',
              organizationSlug: oidcError.extensions?.organizationSlug as string,
              oidcIntegrationId: oidcError.extensions?.oidcIntegrationId as string,
            };
            return true;
          }

          return false;
        },
        async refreshAuth() {
          if (action.type === 'NEEDS_REFRESH' && (await Session.attemptRefreshingSession())) {
            location.reload();
          } else if (action.type === 'VERIFY_EMAIL') {
            window.location.href = '/auth/verify-email';
          } else if (action.type === 'NEEDS_OIDC') {
            window.location.href = `/${action.organizationSlug}/oidc-request?id=${action.oidcIntegrationId}&redirectToPath=${encodeURIComponent(window.location.pathname)}`;
          } else {
            await Session.signOut();
            window.location.href = `/auth?redirectToPath=${encodeURIComponent(window.location.pathname)}`;
          }
        },
      };
    }),
    env.graphql.persistedOperationsPrefix !== null
      ? mapExchange({
          /**
           * urql is requires the document node to contain zero definitions and a property named "documentId",
           * due to tight-coupling with graphql.tada
           **/
          onOperation(op) {
            return {
              ...op,
              query: {
                documentId:
                  (env.graphql.persistedOperationsPrefix ?? '') +
                  (op.query as any)?.['__meta__']?.['hash'],
                definitions: [],
              } as any,
            };
          },
        })
      : null,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription(operation) {
        return {
          subscribe: sink => {
            const usePersistedOperations = env.graphql.persistedOperationsPrefix !== null;

            const dispose = sseClient.subscribe(
              {
                ...(usePersistedOperations
                  ? { documentId: operation.documentId! }
                  : { query: operation.query! }),
                operationName: operation.operationName,
                variables: operation.variables,
                extensions: operation.extensions,
              } satisfies GraphQLPayload as any,
              sink,
            );
            return {
              unsubscribe: () => dispose(),
            };
          },
        };
      },
    }),
  ].filter(isSome),
});

type GraphQLPayload = {
  variables?: Record<string, any>;
  operationName?: string;
  extensions?: Record<string, any>;
} & (
  | {
      query: string;
      documentId?: void;
    }
  | {
      query?: void;
      documentId: string;
    }
);

// @ts-expect-error for testing purposes ok
window.__YOU_ARE_FIRED_attemptSessionRefresh = () => Session.attemptRefreshingSession();
