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
        const response = await fetch(endpoint, {
          signal,
          method: 'POST',
          body: JSON.stringify({
            query: getIntrospectionQuery(),
          }),
          headers: {
            'Content-Type': 'application/json',
          },
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
    [endpoint],
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
