import { useQuery } from 'urql';
import { ViewerQuery } from '@/components/layouts/queries';

export function useViewer() {
  const [query] = useQuery({ query: ViewerQuery, requestPolicy: 'cache-first' });
  return query;
}
