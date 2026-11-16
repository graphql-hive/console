import { useEffect, useMemo } from 'react';
import { buildSchema, introspectionFromSchema, type IntrospectionQuery } from 'graphql';
import { useToast } from '@/components/ui/primitives/toast/toast';

/** Builds the lab's introspection from the target's SDL; a schema that fails to build is toasted. */
export function useSchemaIntrospection(sdl: string | null | undefined): IntrospectionQuery | null {
  const { toast } = useToast();

  const result = useMemo((): { introspection: IntrospectionQuery | null; error: string | null } => {
    if (!sdl) {
      return { introspection: null, error: null };
    }

    try {
      return { introspection: introspectionFromSchema(buildSchema(sdl)), error: null };
    } catch (err) {
      return { introspection: null, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [sdl]);

  useEffect(() => {
    if (result.error) {
      toast({ title: 'Failed to fetch schema', description: result.error, variant: 'destructive' });
    }
  }, [result.error, toast]);

  return result.introspection;
}
