import { useMemo } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  GraphQlFields_FieldFragmentFragment,
  GraphQlInputFields_InputFieldFragmentFragment,
  SupergraphMetadataList_SupergraphMetadataFragmentFragment,
} from '../../../gql/graphql';
import { useSchemaExplorerContext } from './provider';

export function useExplorerFieldFiltering<
  T extends GraphQlFields_FieldFragmentFragment | GraphQlInputFields_InputFieldFragmentFragment,
>({ fields }: { fields: T[] }) {
  const { hasMetadataFilter, metadata: filterMeta } = useSchemaExplorerContext();

  const router = useRouter();
  const searchObj = router.latestLocation.search;
  const search =
    'search' in searchObj && typeof searchObj.search === 'string'
      ? searchObj.search.toLowerCase()
      : undefined;

  return useMemo(() => {
    return fields
      .filter(field => {
        let doesMatchFilter = true;
        if (search) {
          doesMatchFilter &&= field.name.toLowerCase().includes(search);
        }
        if (filterMeta.length) {
          const doesMatchMeta =
            field.supergraphMetadata &&
            (
              field.supergraphMetadata as SupergraphMetadataList_SupergraphMetadataFragmentFragment
            ).metadata?.some(m => hasMetadataFilter(m.name, m.content));
          doesMatchFilter &&= !!doesMatchMeta;
        }
        return doesMatchFilter;
      })
      .sort((a, b) => b.usage.total - a.usage.total || a.name.localeCompare(b.name));
  }, [fields, search, filterMeta, hasMetadataFilter]);
}
