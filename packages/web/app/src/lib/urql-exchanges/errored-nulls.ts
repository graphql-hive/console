import { mapExchange, type OperationResult } from '@urql/core';

type Path = readonly (string | number)[];

/**
 * Drops from a result's data the nulls that only exist because a field below them failed. A
 * non-null field that errors nulls its nearest nullable ancestor, and the cache would store that
 * null as a real answer: the next cache-first read of the same document then shows empty data,
 * without the error. With the ancestor absent instead, the cache stores nothing for it and a later
 * read misses, so the error is fetched again rather than hidden.
 */
export function withoutErroredNulls<Data>(result: OperationResult<Data>): OperationResult<Data> {
  const errors = result.error?.graphQLErrors ?? [];
  if (!result.data || typeof result.data !== 'object' || errors.length === 0) {
    return result;
  }
  let data = result.data as Record<string, unknown>;
  for (const error of errors) {
    const dropped = error.path ? dropNullOn(data, error.path) : data;
    if (dropped !== data) {
      data = dropped;
    }
  }
  return data === result.data ? result : { ...result, data: data as Data };
}

/** The data without the first null on `path`, copying the containers above it; or the data as is. */
function dropNullOn(data: Record<string, unknown>, path: Path): Record<string, unknown> {
  const containers: Array<Record<string, unknown> | unknown[]> = [data];
  for (let i = 0; i < path.length; i++) {
    const container = containers[i];
    const value = (container as Record<string | number, unknown>)[path[i]];
    if (value === null) {
      let copy: unknown = Array.isArray(container)
        ? container.filter((_, index) => index !== path[i])
        : omit(container as Record<string, unknown>, path[i] as string);
      for (let j = i - 1; j >= 0; j--) {
        const parent = containers[j];
        copy = Array.isArray(parent)
          ? parent.map((item, index) => (index === path[j] ? copy : item))
          : { ...parent, [path[j]]: copy };
      }
      return copy as Record<string, unknown>;
    }
    if (value === undefined || typeof value !== 'object') {
      return data;
    }
    containers.push(value as Record<string, unknown> | unknown[]);
  }
  return data;
}

function omit(object: Record<string, unknown>, key: string) {
  const { [key]: _dropped, ...rest } = object;
  return rest;
}

export const erroredNullsExchange = mapExchange({ onResult: withoutErroredNulls });
