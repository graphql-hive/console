import {
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import { filter, fromPromise, fromValue, mergeMap, pipe } from 'wonka';
import { cacheOptions } from '@/lib/urql-cache';
import {
  createClient,
  makeErrorResult,
  makeResult,
  type Exchange,
  type Operation,
} from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';

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
 * today, not as it was when the fixture was written. `null` satisfies any selection. The client's
 * documents arrive formatted by graphcache, which selects `__typename` below the root, so fixtures
 * carry it on every object as the server would; without it the cache reads back null.
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
          ? !!variables[argument.name!.value]
          : argument?.kind === Kind.BOOLEAN
            ? !!argument.value
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
      for (const [index, item] of value.entries()) {
        walk(selectionSet, item, `${path}[${index}]`);
      }
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
        if (key === '__typename' && path === '') continue;
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
 * A urql client on the app's own graphcache configuration whose only network is a lookup in
 * `fixtures` by operation name, so a spec can answer several different queries in one tree and
 * normalization, pagination resolvers and mutation updaters behave as they do in the app. An operation without a fixture resolves with no
 * data and no error, which is what a page shows while a query is still in flight, so pages a spec
 * does not care about render their loading branch rather than throw. A fixture that no longer
 * covers what its query selects throws, naming the missing paths, so fixtures cannot drift from
 * the documents. `fixtures` is the live map; `seen` records every operation name asked for and
 * `operations` every operation. A promise fixture holds its answer until it settles.
 */
export function createTestClient(fixtures: Fixtures = new Map()) {
  const seen: string[] = [];
  const operations: Operation[] = [];

  function uncovered(operation: Operation, name: string, data: unknown) {
    if (data === undefined) {
      return null;
    }
    const missing = missingSelections(operation.query, data, operation.variables ?? {});
    return missing.length > 0
      ? `Fixture for ${name} does not cover its query; missing: ${missing.join(', ')}`
      : null;
  }

  const resolve: Exchange = () => operations$ =>
    pipe(
      operations$,
      filter(operation => operation.kind !== 'teardown'),
      mergeMap(operation => {
        const name = operationName(operation) ?? '';
        seen.push(name);
        operations.push(operation);
        const fixture = fixtures.get(name);
        const answer = typeof fixture === 'function' ? fixture(operation.variables ?? {}) : fixture;

        // A throw here would be an unhandled rejection, so a stale async fixture answers with an error.
        if (answer instanceof Promise) {
          return fromPromise(
            answer.then(data => {
              const message = uncovered(operation, name, data);
              return message
                ? makeErrorResult(operation, new Error(message))
                : makeResult(operation, { data });
            }),
          );
        }

        const message = uncovered(operation, name, answer);
        if (message) {
          throw new Error(message);
        }
        return fromValue(makeResult(operation, { data: answer }));
      }),
    );

  const client = createClient({
    url: 'http://test.invalid/graphql',
    exchanges: [cacheExchange(cacheOptions), resolve],
  });

  return Object.assign(client, { fixtures, seen, operations });
}
