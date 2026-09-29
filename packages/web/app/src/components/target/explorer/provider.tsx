import { createContext, ReactElement, ReactNode, useCallback, useContext } from 'react';
import { z } from 'zod';
import { useLocalStorageJson } from '@/lib/hooks';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';

type SchemaExplorerContextType = {
  isDescriptionsVisible: boolean;
  setDescriptionsVisible(isCollapsed: boolean): void;
  setMetadataFilter(name: string, value: string): void;
  bulkSetMetadataFilter(filters: Array<{ name: string; values: string[] }>): void;
  /** Replaces the whole `meta` param with `name:value` entries. */
  setMetadataFilters(entries: string[]): void;
  unsetMetadataFilter(name: string, value: string): void;
  hasMetadataFilter(name: string, value: string): boolean;
  clearMetadataFilter(name?: string): void;
  metadata: string[];
  subgraphs: string[];
  setSubgraphFilters(names: string[]): void;
  clearSubgraphFilter(): void;
};

const SchemaExplorerContext = createContext<SchemaExplorerContextType>({
  isDescriptionsVisible: true,
  setDescriptionsVisible: () => {},
  setMetadataFilter: () => {},
  bulkSetMetadataFilter: () => {},
  setMetadataFilters: () => {},
  unsetMetadataFilter: () => {},
  hasMetadataFilter: () => false,
  clearMetadataFilter: () => {},
  metadata: [],
  subgraphs: [],
  setSubgraphFilters: () => {},
  clearSubgraphFilter: () => {},
});

function filterUnique(array: string[]) {
  return array.filter((value, index, self) => self.indexOf(value) === index);
}

export function SchemaExplorerProvider({ children }: { children: ReactNode }): ReactElement {
  const [isDescriptionsVisible, setDescriptionsVisible] = useLocalStorageJson(
    'hive:schema-explorer:collapsed',
    z.boolean().default(false),
  );
  const [metadata, setMetadataFilter] = useSearchParamsFilter('meta', [] as string[]);
  const [subgraphs, setSubgraphs] = useSearchParamsFilter('subgraph', [] as string[]);

  return (
    <SchemaExplorerContext.Provider
      value={{
        isDescriptionsVisible,
        setDescriptionsVisible,
        setMetadataFilter(name, value) {
          setMetadataFilter(filterUnique([...metadata, `${name}:${value}`]));
        },
        /** Adds to the metadata list */
        bulkSetMetadataFilter(filters) {
          setMetadataFilter(
            filterUnique([
              ...metadata,
              ...filters.flatMap(f => f.values.map(v => `${f.name}:${v}`)),
            ]),
          );
        },
        unsetMetadataFilter(name, value) {
          const data = [...metadata];
          const index = data.indexOf(`${name}:${value}`);
          if (index >= 0) {
            data.splice(index, 1);
            setMetadataFilter(data);
          }
        },
        setMetadataFilters(entries) {
          setMetadataFilter(filterUnique(entries));
        },
        clearMetadataFilter(name?: string) {
          if (name) {
            setMetadataFilter(metadata.filter(d => !d.startsWith(`${name}:`)));
          } else {
            setMetadataFilter([]);
          }
        },
        hasMetadataFilter(name, value) {
          return metadata.includes(`${name}:${value}`);
        },
        metadata,
        subgraphs,
        setSubgraphFilters(names) {
          setSubgraphs(filterUnique(names));
        },
        clearSubgraphFilter() {
          setSubgraphs([]);
        },
      }}
    >
      {children}
    </SchemaExplorerContext.Provider>
  );
}

export function useSchemaExplorerContext() {
  return useContext(SchemaExplorerContext);
}

export function useDescriptionsVisibleToggle() {
  const { isDescriptionsVisible, setDescriptionsVisible } = useSchemaExplorerContext();
  const toggleDescriptionsVisible = useCallback(() => {
    setDescriptionsVisible(!isDescriptionsVisible);
  }, [setDescriptionsVisible, isDescriptionsVisible]);

  return { isDescriptionsVisible, toggleDescriptionsVisible };
}
