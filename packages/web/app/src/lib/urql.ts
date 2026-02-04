import { createClient as createSSEClient } from 'graphql-sse';
import Session from 'supertokens-auth-react/recipe/session';
import { createClient, fetchExchange, mapExchange, subscriptionExchange } from 'urql';
import { env } from '@/env/frontend';
import schema from '@/gql/schema';
import { authExchange } from '@urql/exchange-auth';
import { cacheExchange } from '@urql/exchange-graphcache';
import { relayPagination } from '@urql/exchange-graphcache/extras';
import { Mutation } from './urql-cache';
import { networkStatusExchange } from './urql-exchanges/state';

const noKey = (): null => null;

const isSome = <T>(value: T | null | undefined): value is T => value != null;

const sseClient = createSSEClient({
  url: env.graphqlPublicSubscriptionEndpoint,
  credentials: 'include',
});

export const urqlClient = createClient({
  url: env.graphqlPublicEndpoint,
  fetchOptions: {
    headers: {
      'graphql-client-name': 'hive-app',
      'graphql-client-version': env.release,
    },
  },
  exchanges: [
    cacheExchange({
      schema,
      updates: {
        Mutation,
      },
      resolvers: {
        Target: {
          appDeployments: relayPagination(),
          traces: relayPagination(),
        },
        AppDeployment: {
          documents: relayPagination(),
        },
        Organization: {
          accessTokens: relayPagination(),
        },
      },
      keys: {
        RequestsOverTime: noKey,
        FailuresOverTime: noKey,
        DurationOverTime: noKey,
        SchemaCoordinateStats: noKey,
        ClientStats: noKey,
        ClientStatsValues: noKey,
        OperationsStats: noKey,
        OperationStatsValues: noKey,
        DurationValues: noKey,
        OrganizationPayload: noKey,
        SchemaChange: noKey,
        GitHubIntegration: noKey,
        GitHubRepository: noKey,
        SchemaExplorer: noKey,
        UnusedSchemaExplorer: noKey,
        OrganizationGetStarted: noKey,
        GraphQLObjectType: noKey,
        GraphQLInterfaceType: noKey,
        GraphQLUnionType: noKey,
        GraphQLEnumType: noKey,
        GraphQLInputObjectType: noKey,
        GraphQLScalarType: noKey,
        GraphQLField: noKey,
        GraphQLInputField: noKey,
        GraphQLArgument: noKey,
        SchemaCoordinateUsage: noKey,
        SuccessfulSchemaCheck: ({ id }) => `SchemaCheck:${id}`,
        FailedSchemaCheck: ({ id }) => `SchemaCheck:${id}`,
        SchemaChangeApproval: ({ schemaCheckId }) => `SchemaChangeApproval:${schemaCheckId}`,
        SchemaMetadata: noKey,
        SupergraphMetadata: noKey,
        MetadataAttribute: noKey,
        RateLimit: noKey,
        DeprecatedSchemaExplorer: noKey,
        TraceStatusBreakdownBucket: noKey,
        FilterStringOption: noKey,
        FilterBooleanOption: noKey,
        TracesFilterOptions: noKey,
        ResourceAssignment: noKey,
        TargetServicesResourceAssignment: noKey,
        TargetAppDeploymentsResourceAssignment: noKey,
        TargetResouceAssignment: noKey,
        ProjectTargetsResourceAssignment: noKey,
        ProjectResourceAssignment: noKey,
        BillingConfiguration: noKey,
        SchemaChangeMeta: noKey,
        SchemaCheckMeta: noKey,
        FieldArgumentDescriptionChanged: noKey,
        FieldArgumentTypeChanged: noKey,
        DirectiveRemoved: noKey,
        DirectiveAdded: noKey,
        DirectiveDescriptionChanged: noKey,
        DirectiveLocationAdded: noKey,
        DirectiveLocationRemoved: noKey,
        DirectiveArgumentAdded: noKey,
        DirectiveArgumentRemoved: noKey,
        DirectiveArgumentDescriptionChanged: noKey,
        DirectiveArgumentDefaultValueChanged: noKey,
        DirectiveArgumentTypeChanged: noKey,
        EnumValueRemoved: noKey,
        EnumValueAdded: noKey,
        EnumValueDescriptionChanged: noKey,
        EnumValueDeprecationReasonChanged: noKey,
        EnumValueDeprecationReasonAdded: noKey,
        EnumValueDeprecationReasonRemoved: noKey,
        FieldRemoved: noKey,
        FieldAdded: noKey,
        FieldDescriptionChanged: noKey,
        FieldDescriptionAdded: noKey,
        FieldDescriptionRemoved: noKey,
        FieldDeprecationAdded: noKey,
        FieldDeprecationRemoved: noKey,
        FieldDeprecationReasonChanged: noKey,
        FieldDeprecationReasonAdded: noKey,
        FieldDeprecationReasonRemoved: noKey,
        FieldTypeChanged: noKey,
        DirectiveUsageUnionMemberAdded: noKey,
        DirectiveUsageUnionMemberRemoved: noKey,
        FieldArgumentAdded: noKey,
        FieldArgumentRemoved: noKey,
        InputFieldRemoved: noKey,
        InputFieldAdded: noKey,
        InputFieldDescriptionAdded: noKey,
        InputFieldDescriptionRemoved: noKey,
        InputFieldDescriptionChanged: noKey,
        InputFieldDefaultValueChanged: noKey,
        InputFieldTypeChanged: noKey,
        ObjectTypeInterfaceAdded: noKey,
        ObjectTypeInterfaceRemoved: noKey,
        SchemaQueryTypeChanged: noKey,
        SchemaMutationTypeChanged: noKey,
        SchemaSubscriptionTypeChanged: noKey,
        TypeRemoved: noKey,
        TypeAdded: noKey,
        TypeKindChanged: noKey,
        TypeDescriptionChanged: noKey,
        TypeDescriptionAdded: noKey,
        TypeDescriptionRemoved: noKey,
        UnionMemberRemoved: noKey,
        UnionMemberAdded: noKey,
        DirectiveUsageEnumAdded: noKey,
        DirectiveUsageEnumRemoved: noKey,
        DirectiveUsageEnumValueAdded: noKey,
        DirectiveUsageEnumValueRemoved: noKey,
        DirectiveUsageInputObjectRemoved: noKey,
        DirectiveUsageInputObjectAdded: noKey,
        DirectiveUsageInputFieldDefinitionAdded: noKey,
        DirectiveUsageInputFieldDefinitionRemoved: noKey,
        DirectiveUsageFieldAdded: noKey,
        DirectiveUsageFieldRemoved: noKey,
        DirectiveUsageScalarAdded: noKey,
        DirectiveUsageScalarRemoved: noKey,
        DirectiveUsageObjectAdded: noKey,
        DirectiveUsageObjectRemoved: noKey,
        DirectiveUsageInterfaceAdded: noKey,
        DirectiveUsageSchemaAdded: noKey,
        DirectiveUsageSchemaRemoved: noKey,
        DirectiveUsageFieldDefinitionAdded: noKey,
        DirectiveUsageFieldDefinitionRemoved: noKey,
        DirectiveUsageArgumentDefinitionRemoved: noKey,
        DirectiveUsageInterfaceRemoved: noKey,
        DirectiveUsageArgumentDefinitionAdded: noKey,
        DirectiveUsageArgumentAdded: noKey,
        DirectiveUsageArgumentRemoved: noKey,
        DirectiveRepeatableAdded: noKey,
        DirectiveRepeatableRemoved: noKey,
      },
      globalIDs: ['SuccessfulSchemaCheck', 'FailedSchemaCheck'],
    }),
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
