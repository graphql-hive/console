/** A utility class for managing collections associated with a key. E.g. metadata */

export class SetMap<$Key extends string | number | symbol, $Value> {
  private internals = new Map<$Key, Set<$Value>>();

  keys(): MapIterator<$Key> {
    return this.internals.keys();
  }

  values(key: $Key): $Value[] | undefined {
    return this.internals.get(key)?.values().toArray();
  }

  /** Mutates the set to add a new value */
  add(key: $Key, value: $Value): Set<$Value> {
    let values = this.internals.get(key);
    if (!values) {
      values = new Set<$Value>([value]);
      this.internals.set(key, values);
    } else {
      values.add(value);
    }
    return values;
  }

  delete(key: $Key, value?: $Value): boolean {
    if (value) {
      const values = this.internals.get(key);
      const deleted = !!values?.delete(value);
      if (values?.size === 0) {
        this.internals.delete(key);
      }
      return deleted;
    }

    return this.internals.delete(key);
  }

  toObject = (): Record<string, $Value[]> =>
    Object.fromEntries(this.internals.entries().map(e => [e[0], Array.from(e[1].values())]));
}
