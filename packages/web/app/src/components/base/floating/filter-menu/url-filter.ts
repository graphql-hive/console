import type { useNavigate } from '@tanstack/react-router';
import type { FilterDimension, FilterItem, FilterSelection } from './types';

type NavigateFn = ReturnType<typeof useNavigate>;

/**
 * Build a `FilterDimension` whose state lives in URL search params. Pair with
 * a TanStack route that has `validateSearch` set up to accept the relevant
 * keys. The returned dimension has `onChange` / `onRemove` /
 * `onExcludeModeChange` callbacks pre-wired to call `navigate`.
 */
export function urlFilterDimension<TSearch extends Record<string, unknown>>(config: {
  navigate: NavigateFn;
  search: TSearch;
  /** URL key holding this dimension's selected values. */
  searchKey: keyof TSearch & string;
  /** Optional sibling URL key holding an exclude-mode boolean. */
  excludeKey?: keyof TSearch & string;
  /** Stable key for React reconciliation. */
  key: string;
  /** Display label. */
  label: string;
  /** All selectable items. */
  items: FilterItem[];
  /** FilterSelection[] → URL value. Return `undefined` to clear the key. */
  encode: (selections: FilterSelection[]) => unknown;
  /** URL value → FilterSelection[]. */
  decode: (value: unknown) => FilterSelection[];
  /** Optional sub-values label (e.g. "versions"). */
  valuesLabel?: string;
}): FilterDimension {
  const {
    navigate,
    search,
    searchKey,
    excludeKey,
    key,
    label,
    items,
    encode,
    decode,
    valuesLabel,
  } = config;

  const selectedItems = decode(search[searchKey]);
  const excludeMode = excludeKey !== undefined ? !!search[excludeKey] : undefined;

  const onChange = (next: FilterSelection[]) => {
    const encoded = encode(next);
    void navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        [searchKey]: encoded,
      }),
    } as Parameters<NavigateFn>[0]);
  };

  const onRemove = () => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        [searchKey]: undefined,
        ...(excludeKey ? { [excludeKey]: undefined } : {}),
      }),
    } as Parameters<NavigateFn>[0]);
  };

  const onExcludeModeChange = excludeKey
    ? (next: boolean) => {
        void navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            [excludeKey]: next || undefined,
          }),
        } as Parameters<NavigateFn>[0]);
      }
    : undefined;

  return {
    key,
    label,
    items,
    selectedItems,
    onChange,
    onRemove,
    valuesLabel,
    excludeMode,
    onExcludeModeChange,
  };
}

/** Encode `FilterSelection[]` as `string[]` of ids — the common flat case. */
export function encodeIdSelections(selections: FilterSelection[]): string[] | undefined {
  return selections.length > 0 ? selections.map(s => s.id ?? s.name) : undefined;
}

/** Decode `string[]` of ids to `FilterSelection[]` by looking up display names in `items`. */
export function decodeIdSelections(value: unknown, items: FilterItem[]): FilterSelection[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const ids = new Set(value as string[]);
  return items
    .filter(item => ids.has(item.id ?? item.name))
    .map(item => ({ id: item.id, name: item.name, values: null }));
}
