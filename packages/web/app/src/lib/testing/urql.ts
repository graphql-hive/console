import {
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import { filter, map, pipe } from 'wonka';
import { cacheExchange, createClient, makeResult, type Exchange, type Operation } from '@urql/core';

type Fixture = unknown | ((variables: Record<string, unknown>) => unknown);

/** Result data keyed by operation name, e.g. `TargetLayoutQuery`. */
export type Fixtures = Map<string, Fixture>;

export function operationName(operation: Operation): string | undefined {
  for (const node of operation.query.definitions) {
    if (node.kind === Kind.OPERATION_DEFINITION) {
      return node.name?.value;
    }
  }
}

/**
 * The paths the document selects that `data` does not provide. The document is the one the app
 * sends, fragments inlined, so a fixture written by hand is checked against the query as it is
 * today, not as it was when the fixture was written. `null` satisfies any selection; `__typename`
 * is not required.
 */
export function missingSelections(
  document: DocumentNode,
  data: unknown,
  variables: Record<string, unknown>,
): string[] {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(definition.name.value, definition);
    }
  }
  const operation = document.definitions.find(d => d.kind === Kind.OPERATION_DEFINITION);
  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
    return [];
  }

  const missing: string[] = [];

  function isSkipped(
    directives:
      | readonly { name: { value: string }; arguments?: readonly { value: unknown }[] }[]
      | undefined,
  ) {
    for (const directive of directives ?? []) {
      const argument = directive.arguments?.[0]?.value as
        | { kind: string; value?: unknown; name?: { value: string } }
        | undefined;
      const condition =
        argument?.kind === Kind.VARIABLE
          ? Boolean(variables[argument.name!.value])
          : argument?.kind === Kind.BOOLEAN
            ? Boolean(argument.value)
            : undefined;
      if (directive.name.value === 'skip' && condition === true) return true;
      if (directive.name.value === 'include' && condition === false) return true;
    }
    return false;
  }

  function walk(selectionSet: SelectionSetNode, value: unknown, path: string) {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(selectionSet, item, `${path}[${index}]`));
      return;
    }
    if (typeof value !== 'object') {
      missing.push(`${path} (expected an object)`);
      return;
    }
    const object = value as Record<string, unknown>;
    for (const selection of selectionSet.selections) {
      if (isSkipped(selection.directives)) {
        continue;
      }
      if (selection.kind === Kind.FIELD) {
        const key = selection.alias?.value ?? selection.name.value;
        if (key === '__typename') continue;
        if (!(key in object)) {
          missing.push(path ? `${path}.${key}` : key);
          continue;
        }
        if (selection.selectionSet) {
          walk(selection.selectionSet, object[key], path ? `${path}.${key}` : key);
        }
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragment = fragments.get(selection.name.value);
        if (fragment) walk(fragment.selectionSet, value, path);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        walk(selection.selectionSet, value, path);
      }
    }
  }

  walk(operation.selectionSet, data, '');
  return missing;
}

/**
 * A urql client whose only network is a lookup in `fixtures` by operation name, so a spec can
 * answer several different queries in one tree. An operation without a fixture resolves with no
 * data and no error, which is what a page shows while a query is still in flight, so pages a spec
 * does not care about render their loading branch rather than throw. A fixture that no longer
 * covers what its query selects throws, naming the missing paths, so fixtures cannot drift from
 * the documents. `fixtures` is the live map; `seen` records every operation name asked for.
 */
export function createTestClient(fixtures: Fixtures = new Map()) {
  const seen: string[] = [];
  const resolve: Exchange = () => operations$ =>
    pipe(
      operations$,
      filter(operation => operation.kind !== 'teardown'),
      map(operation => {
        const name = operationName(operation) ?? '';
        seen.push(name);
        const fixture = fixtures.get(name);
        const variables = operation.variables ?? {};
        const data = typeof fixture === 'function' ? fixture(variables) : fixture;
        if (data !== undefined) {
          const missing = missingSelections(operation.query, data, variables);
          if (missing.length > 0) {
            throw new Error(
              `Fixture for ${name} does not cover its query; missing: ${missing.join(', ')}`,
            );
          }
        }
        return makeResult(operation, { data });
      }),
    );

  const client = createClient({
    url: 'http://test.invalid/graphql',
    exchanges: [cacheExchange, resolve],
  });

  return Object.assign(client, { fixtures, seen });
}
