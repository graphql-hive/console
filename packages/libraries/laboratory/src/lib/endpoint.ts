import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  type IntrospectionQuery,
} from 'graphql';
import { toast } from 'sonner';

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

  const fetchSchema = useCallback(async () => {
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
        method: 'POST',
        body: JSON.stringify({
          query: getIntrospectionQuery(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(r => r.json());

      setIntrospection(response.data as IntrospectionQuery);
    } catch {
      toast.error('Failed to fetch schema');
      setIntrospection(null);
      return;
    }
  }, [endpoint]);

  const restoreDefaultEndpoint = useCallback(() => {
    if (props.defaultEndpoint) {
      setEndpoint(props.defaultEndpoint);
    }
  }, [props.defaultEndpoint]);

  useEffect(() => {
    if (endpoint) {
      void fetchSchema();
    }
  }, [endpoint, fetchSchema]);

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
