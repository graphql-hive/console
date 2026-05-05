import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildClientSchema,
  GraphQLSchema,
  introspectionFromSchema,
  type IntrospectionQuery,
} from 'graphql';
import { throttle } from 'lodash';
import { toast } from 'sonner';
import { LaboratoryEnv, LaboratoryEnvActions, LaboratoryEnvState } from '@/lib/env';
import { LaboratoryOperationsActions, LaboratoryOperationsState } from '@/lib/operations';
import { handleTemplate } from '@/lib/operations.utils';
import { LaboratoryPluginsActions, LaboratoryPluginsState } from '@/lib/plugins';
// import z from 'zod';
import { asyncInterval } from '@/lib/utils';
import { SubscriptionProtocol, UrlLoader } from '@graphql-tools/url-loader';
import type { LaboratorySettingsActions, LaboratorySettingsState } from './settings';

export interface LaboratoryEndpointState {
  endpoint: string | null;
  schema: GraphQLSchema | null;
  introspection: IntrospectionQuery | null;
  defaultEndpoint: string | null;
}

export interface LaboratoryEndpointActions {
  setEndpoint: (endpoint: string) => void;
  fetchSchema: () => void;
  restoreDefaultEndpoint: () => void;
}

export const EXPECTED_ERROR_REASON = 'Expected error reason';

export const useEndpoint = (props: {
  defaultEndpoint?: string | null;
  onEndpointChange?: (endpoint: string | null) => void;
  defaultSchemaIntrospection?: IntrospectionQuery | null;
  settingsApi?: LaboratorySettingsState & LaboratorySettingsActions;
  operationsApi?: LaboratoryOperationsState & LaboratoryOperationsActions;
  envApi?: LaboratoryEnvState & LaboratoryEnvActions;
  pluginsApi?: LaboratoryPluginsState & LaboratoryPluginsActions;
}): LaboratoryEndpointState & LaboratoryEndpointActions => {
  const [endpoint, _setEndpoint] = useState<string | null>(props.defaultEndpoint ?? null);
  const [introspection, setIntrospection] = useState<IntrospectionQuery | null>(null);

  const setEndpoint = useCallback(
    (endpoint: string) => {
      _setEndpoint(endpoint);
      props.onEndpointChange?.(endpoint);
    },
    [props],
  );

  const schema = useMemo(() => {
    return introspection ? buildClientSchema(introspection) : null;
  }, [introspection]);

  const loader = useMemo(() => new UrlLoader(), []);

  const fetchSchema = useMemo(
    () =>
      throttle(
        async (
          signal?: AbortSignal,
          options?: {
            env?: LaboratoryEnv;
            pluginsState?: Record<string, any>;
          },
        ) => {
          if (endpoint === props.defaultEndpoint && props.defaultSchemaIntrospection) {
            setIntrospection(props.defaultSchemaIntrospection);
            return;
          }

          if (!endpoint) {
            setIntrospection(null);
            return;
          }

          try {
            const parsedHeaders = props.operationsApi?.activeOperation?.headers
              ? JSON.parse(
                  handleTemplate(props.operationsApi?.activeOperation?.headers, {
                    ...(options?.env?.variables ?? {}),
                    plugins: options?.pluginsState ?? {},
                  }),
                )
              : {};

            const result = await loader.load(endpoint, {
              subscriptionsEndpoint: endpoint,
              subscriptionsProtocol:
                (props.settingsApi?.settings.subscriptions.protocol as SubscriptionProtocol) ??
                SubscriptionProtocol.GRAPHQL_SSE,
              headers: parsedHeaders,
              credentials: props.settingsApi?.settings.fetch.credentials,
              specifiedByUrl: true,
              directiveIsRepeatable: true,
              inputValueDeprecation: true,
              retry: props.settingsApi?.settings.fetch.retry,
              timeout: props.settingsApi?.settings.fetch.timeout,
              useGETForQueries: props.settingsApi?.settings.fetch.useGETForQueries,
              exposeHTTPDetailsInExtensions: true,
              descriptions: props.settingsApi?.settings.introspection.schemaDescription ?? false,
              method: props.settingsApi?.settings.introspection.method ?? 'POST',
              fetch: (input: string | URL | Request, init?: RequestInit) =>
                fetch(input, {
                  ...init,
                  signal,
                }),
            });

            if (result.length === 0) {
              throw new Error('Failed to fetch schema');
            }

            if (!result[0].schema) {
              throw new Error('Failed to fetch schema');
            }

            setIntrospection(introspectionFromSchema(result[0].schema));
          } catch (error: unknown) {
            if (
              error &&
              typeof error === 'object' &&
              'message' in error &&
              typeof error.message === 'string'
            ) {
              if (error.message === EXPECTED_ERROR_REASON) {
                return;
              }

              toast.error(error.message);
            } else {
              toast.error('Failed to fetch schema');
            }

            setIntrospection(null);

            throw error;
          }
        },
        500,
      ),
    [
      endpoint,
      props.settingsApi?.settings.fetch.timeout,
      props.settingsApi?.settings.introspection.method,
      props.settingsApi?.settings.introspection.schemaDescription,
      props.operationsApi?.activeOperation?.headers,
      props.envApi?.env?.variables,
      props.pluginsApi?.pluginsState,
    ],
  );

  const shouldPollSchema = useMemo(() => {
    return endpoint !== props.defaultEndpoint || !props.defaultSchemaIntrospection;
  }, [endpoint, props.defaultEndpoint, props.defaultSchemaIntrospection]);

  useEffect(() => {
    if (!shouldPollSchema || !endpoint) {
      return;
    }

    const intervalController = new AbortController();

    void asyncInterval(
      async () => {
        try {
          await fetchSchema(intervalController.signal);
        } catch {
          intervalController.abort(new Error('Aborted because of schema polling error'));
        }
      },
      5000,
      intervalController.signal,
    );

    return () => {
      intervalController.abort(new Error(EXPECTED_ERROR_REASON));
    };
  }, [shouldPollSchema, fetchSchema]);

  const restoreDefaultEndpoint = useCallback(() => {
    if (props.defaultEndpoint) {
      setEndpoint(props.defaultEndpoint);
    }
  }, [props.defaultEndpoint]);

  useEffect(() => {
    if (endpoint && !shouldPollSchema) {
      const abortController = new AbortController();

      void fetchSchema(abortController.signal);

      return () => {
        abortController.abort(new Error(EXPECTED_ERROR_REASON));
      };
    }
  }, [endpoint, fetchSchema, shouldPollSchema]);

  return {
    endpoint,
    setEndpoint,
    schema,
    introspection,
    fetchSchema,
    restoreDefaultEndpoint,
    defaultEndpoint: props.defaultEndpoint ?? null,
  };
};
