import { useCallback } from 'react';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { laboratoryStorage } from '@/lib/laboratory-storage';

export type ApiTabValue = 'mockApi' | 'linkedApi';

/** The Mock/API choice, saved per target. Falls back to Mock when the target has no endpoint. */
export function useApiTabValue(targetId: string | null, graphqlEndpointUrl: string | null) {
  const [state, setState] = useResetState<ApiTabValue>(() => {
    const value = targetId ? laboratoryStorage(targetId).get<string | null>('apiTab', null) : null;

    if (value !== 'mockApi' && value !== 'linkedApi') {
      return graphqlEndpointUrl ? 'linkedApi' : 'mockApi';
    }

    return value === 'linkedApi' && graphqlEndpointUrl ? 'linkedApi' : 'mockApi';
  }, [targetId, graphqlEndpointUrl]);

  return [
    state,
    useCallback(
      (value: ApiTabValue) => {
        if (targetId) {
          laboratoryStorage(targetId).set('apiTab', value);
        }
        setState(value);
      },
      [targetId, setState],
    ),
  ] as const;
}
