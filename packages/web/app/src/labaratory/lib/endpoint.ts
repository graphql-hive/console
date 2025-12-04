import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  type IntrospectionQuery,
} from 'graphql';
import { toast } from 'sonner';

export interface LabaratoryEndpointState {
  endpoint: string | null;
  schema: GraphQLSchema | null;
  introspection: IntrospectionQuery | null;
}

export interface LabaratoryEndpointActions {
  setEndpoint: (endpoint: string) => void;
  fetchSchema: () => void;
}

export const useEndpoint = (props: {
  defaultEndpoint?: string | null;
  onEndpointChange?: (endpoint: string | null) => void;
}): LabaratoryEndpointState & LabaratoryEndpointActions => {
  // eslint-disable-next-line react/hook-use-state
  const [endpoint, _setEndpoint] = useState<string | null>(props.defaultEndpoint ?? null);
  const [introspection, setIntrospection] = useState<IntrospectionQuery | null>(null);
  

  const setEndpoint = useCallback((endpoint: string) => {
    _setEndpoint(endpoint);
    props.onEndpointChange?.(endpoint);
  }, [props]);

  const schema = useMemo(() => {
    return introspection ? buildClientSchema(introspection) : null;
  }, [introspection]);

  const fetchSchema = useCallback(async () => {
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
  };
};
