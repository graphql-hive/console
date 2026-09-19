/**
 * The one place the dev WebSocket servers reach into yoga.
 *
 * Both of them need a schema, a parsed document and an execute/subscribe pair, and
 * both must take them from `getEnveloped()` rather than importing `graphql`: the
 * workspace has two copies of that package and mixing them fails yoga's instanceof
 * checks with "Duplicate graphql modules cannot be used" (see dev/mock-graphql.ts).
 */
import type { IncomingMessage } from 'node:http';
import type { createMockYoga } from './mock-graphql';

export type MockYoga = ReturnType<typeof createMockYoga>;

type Enveloped = ReturnType<MockYoga['getEnveloped']>;

/** Carried on `rootValue` so a caller can run the operation with the same envelope. */
export type EnvelopedRoot = Pick<Enveloped, 'execute' | 'subscribe'>;

export type SubscribePayload = {
  query: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
  extensions?: Record<string, unknown> | null;
};

export type ConnectionExtra = { request: IncomingMessage; socket: unknown };

/**
 * Returns execution args ready to run, or the validation errors that stopped it.
 * The shape matches what graphql-ws's `onSubscribe` is allowed to return, so the
 * legacy server and the modern one can share it.
 */
export const buildExecutionArgs = async (
  yoga: MockYoga,
  payload: SubscribePayload,
  extra: ConnectionExtra,
) => {
  const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
    ...extra,
    req: extra.request,
    params: payload,
  });

  const args = {
    schema,
    operationName: payload.operationName ?? undefined,
    document: parse(payload.query),
    variableValues: payload.variables ?? undefined,
    contextValue: await contextFactory(),
    rootValue: { execute, subscribe } satisfies EnvelopedRoot,
  };

  const errors = validate(args.schema, args.document);

  return errors.length ? errors : args;
};

/**
 * graphql-js picks the subscription root type for anything handed to `subscribe`, so
 * the operation kind has to be decided before calling it. Read off the document
 * rather than with graphql's own helpers, for the duplicate-module reason above.
 */
export const isSubscription = (
  document: { definitions: ReadonlyArray<Record<string, unknown>> },
  operationName?: string | null,
) =>
  document.definitions.some(definition => {
    if (definition.kind !== 'OperationDefinition' || definition.operation !== 'subscription') {
      return false;
    }

    const name = (definition.name as { value?: string } | undefined)?.value;

    return !operationName || name === operationName;
  });
