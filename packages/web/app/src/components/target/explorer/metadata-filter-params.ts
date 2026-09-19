import type {
  FilterItem,
  FilterSelection,
} from '@/components/base/floating/filter-menu/filter-menu';

export type MetadataAttribute = { name: string; values: string[] };

const SEPARATOR = ':';

/** The provider keeps metadata as flat `name:value` entries in the `meta` search param. */
export function encodeMetadataEntry(name: string, value: string) {
  return `${name}${SEPARATOR}${value}`;
}

export function toMetadataItems(attributes: readonly MetadataAttribute[]): FilterItem[] {
  return attributes.map(({ name, values }) => ({ name, values: [...values] }));
}

/**
 * Flat `meta` entries to the two-level selection the filter menu expects.
 *
 * Entries are matched against the known attributes rather than split on the
 * first separator, because a metadata *value* may itself contain a colon.
 * Anything that no longer matches a live attribute or value is dropped, so a
 * stale URL degrades to a narrower filter instead of an unselectable one.
 */
export function toMetadataSelections(
  meta: readonly string[],
  attributes: readonly MetadataAttribute[],
): FilterSelection[] {
  const selectedByName = new Map<string, string[]>();

  for (const entry of meta) {
    const attribute = attributes.find(a => entry.startsWith(a.name + SEPARATOR));
    if (!attribute) continue;

    const value = entry.slice(attribute.name.length + SEPARATOR.length);
    if (!attribute.values.includes(value)) continue;

    const selected = selectedByName.get(attribute.name) ?? [];
    if (!selected.includes(value)) {
      selected.push(value);
    }
    selectedByName.set(attribute.name, selected);
  }

  return attributes
    .filter(attribute => selectedByName.has(attribute.name))
    .map(attribute => {
      const selected = selectedByName.get(attribute.name)!;
      return {
        name: attribute.name,
        // null is the menu's "all values", which keeps the parent checkbox
        // fully checked rather than indeterminate.
        values: selected.length === attribute.values.length ? null : selected,
      };
    });
}

/** The inverse: expands "all values" back to the attribute's full value list. */
export function fromMetadataSelections(
  selections: readonly FilterSelection[],
  attributes: readonly MetadataAttribute[],
): string[] {
  const valuesByName = new Map(attributes.map(a => [a.name, a.values]));
  const entries: string[] = [];

  for (const selection of selections) {
    const known = valuesByName.get(selection.name);
    if (!known) continue;

    for (const value of selection.values ?? known) {
      if (!known.includes(value)) continue;

      const entry = encodeMetadataEntry(selection.name, value);
      if (!entries.includes(entry)) {
        entries.push(entry);
      }
    }
  }

  return entries;
}
