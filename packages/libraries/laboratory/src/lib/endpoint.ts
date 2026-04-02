import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  type IntrospectionQuery,
} from 'graphql';
import { toast } from 'sonner';
import z from 'zod';
import { asyncInterval } from '@/lib/utils';
import { createRequestSignal } from './request';
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

function buildIntrospectionRequest(
  queryName?: string,
  method?: 'GET' | 'POST',
  schemaDescription?: boolean,
) {
  const query = getIntrospectionQuery({
    schemaDescription,
  }).replace('query IntrospectionQuery', `query ${queryName ?? 'IntrospectionQuery'}`);

  return {
    method,
    query,
  } as const;
}

const GraphQLResponseErrorSchema = z
  .object({
    errors: z.array(
      z.object({
        message: z.string(),
      }),
    ),
  })
  .strict();

export const useEndpoint = (props: {
  defaultEndpoint?: string | null;
  onEndpointChange?: (endpoint: string | null) => void;
  defaultSchemaIntrospection?: IntrospectionQuery | null;
  settingsApi?: LaboratorySettingsState & LaboratorySettingsActions;
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

  const fetchSchema = useCallback(
    async (signal?: AbortSignal) => {
      if (endpoint === props.defaultEndpoint && props.defaultSchemaIntrospection) {
        setIntrospection(props.defaultSchemaIntrospection);
        return;
      }

      if (!endpoint) {
        setIntrospection(null);
        return;
      }

      try {
        const introspectionRequest = buildIntrospectionRequest(
          props.settingsApi?.settings.introspection.queryName,
          props.settingsApi?.settings.introspection.method,
          props.settingsApi?.settings.introspection.schemaDescription,
        );

        const requestSignal = createRequestSignal(
          signal,
          props.settingsApi?.settings.fetch.timeout,
        );
        const requestUrl =
          introspectionRequest.method === 'GET'
            ? (() => {
                const url = new URL(endpoint);
                url.searchParams.set('query', introspectionRequest.query);
                return url.toString();
              })()
            : endpoint;

        const response = await fetch(requestUrl, {
          signal: requestSignal,
          method: introspectionRequest.method,
          body:
            introspectionRequest.method === 'POST'
              ? JSON.stringify({
                  query: introspectionRequest.query,
                })
              : undefined,
          headers:
            introspectionRequest.method === 'POST'
              ? {
                  'Content-Type': 'application/json',
                }
              : undefined,
        }).then(r => r.json());

        const parsedResponse = GraphQLResponseErrorSchema.safeParse(response);

        if (parsedResponse.success) {
          throw new Error(parsedResponse.data.errors.map(e => e.message).join('\n'));
        }

        if (response.error && typeof response.error === 'string') {
          throw new Error(response.error);
        }

        setIntrospection(response.data as IntrospectionQuery);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
        ) {
          toast.error(error.message);
        } else {
          toast.error('Failed to fetch schema');
        }

        setIntrospection(null);

        throw error;
      }
    },
    [
      endpoint,
      props.settingsApi?.settings.fetch.timeout,
      props.settingsApi?.settings.introspection.queryName,
      props.settingsApi?.settings.introspection.method,
      props.settingsApi?.settings.introspection.schemaDescription,
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
          intervalController.abort();
        }
      },
      5000,
      intervalController.signal,
    );

    return () => {
      intervalController.abort();
    };
  }, [shouldPollSchema, fetchSchema]);

  const restoreDefaultEndpoint = useCallback(() => {
    if (props.defaultEndpoint) {
      setEndpoint(props.defaultEndpoint);
    }
  }, [props.defaultEndpoint]);

  useEffect(() => {
    if (endpoint && !shouldPollSchema) {
      void fetchSchema();
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
