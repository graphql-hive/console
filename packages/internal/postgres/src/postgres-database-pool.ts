import type { Pool } from 'pg';
import {
  createPool,
  createTypeParserPreset,
  parseDsn,
  type DatabasePool,
  type Interceptor,
  type PrimitiveValueExpression,
  type QuerySqlToken,
  type CommonQueryMethods as SlonikCommonQueryMethods,
} from 'slonik';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';
import { context, SpanKind, SpanStatusCode, trace, withErrorSource } from '@hive/service-common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createConnectionString,
  type ConnectionStringProvider,
  type PostgresConnectionParamaters,
} from './connection-string';
import { PgPoolBridge } from './pg-pool-bridge';

const tracer = trace.getTracer('storage');

export interface CommonQueryMethods {
  exists<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<boolean>;
  any<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<StandardSchemaV1.InferOutput<T>>>;
  maybeOne<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>>;
  query(sql: QuerySqlToken<any>, values?: PrimitiveValueExpression[]): Promise<void>;
  oneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]>;
  one<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>>;
  anyFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]>>;
  maybeOneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]>;
  transaction<T = void>(
    name: string,
    handler: (methods: CommonQueryMethods) => Promise<T>,
  ): Promise<T>;
}

export class PostgresDatabasePool implements CommonQueryMethods {
  constructor(private pool: DatabasePool) {}

  getPgPoolCompat(): Pool {
    return new PgPoolBridge(this.pool) as any;
  }

  /** Retrieve the raw Slonik instance. Refrain from using this API. */
  getSlonikPool() {
    return this.pool;
  }

  async exists<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<boolean> {
    return withErrorSource(this.pool.exists(sql, values), 'pg');
  }

  async any<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<StandardSchemaV1.InferOutput<T>>> {
    return withErrorSource(this.pool.any(sql, values), 'pg');
  }

  async maybeOne<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>> {
    return withErrorSource(this.pool.maybeOne(sql, values), 'pg');
  }

  async query(sql: QuerySqlToken<any>, values?: PrimitiveValueExpression[]): Promise<void> {
    await withErrorSource(this.pool.query(sql, values), 'pg');
  }

  async oneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]> {
    return await withErrorSource(this.pool.oneFirst(sql, values), 'pg');
  }

  async maybeOneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]> {
    return await withErrorSource(this.pool.maybeOneFirst(sql, values), 'pg');
  }

  async one<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>> {
    return await withErrorSource(this.pool.one(sql, values), 'pg');
  }

  async anyFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<
    ReadonlyArray<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]>
  > {
    return await withErrorSource(this.pool.anyFirst(sql, values), 'pg');
  }

  async transaction<T = void>(
    name: string,
    handler: (methods: CommonQueryMethods) => Promise<T>,
  ): Promise<T> {
    const span = tracer.startSpan(`PG Transaction: ${name}`, {
      kind: SpanKind.INTERNAL,
    });

    return withErrorSource(
      context.with(trace.setSpan(context.active(), span), async () => {
        return await this.pool.transaction(async methods => {
          try {
            return await handler({
              // Slonik binds connection methods to a class instance that uses `this`, so forward
              // the calls rather than copying the functions.
              exists: (sql, values) => methods.exists(sql, values),
              any: (sql, values) => methods.any(sql, values),
              maybeOne: (sql, values) => methods.maybeOne(sql, values),
              async query(
                sql: QuerySqlToken<any>,
                values?: PrimitiveValueExpression[],
              ): Promise<void> {
                await methods.query(sql, values);
              },
              oneFirst: (sql, values) => methods.oneFirst(sql, values),
              maybeOneFirst: (sql, values) => methods.maybeOneFirst(sql, values),
              anyFirst: (sql, values) => methods.anyFirst(sql, values),
              one: (sql, values) => methods.one(sql, values),
              transaction<T>(name: string, handler: (methods: CommonQueryMethods) => Promise<T>) {
                // We just mark this as a virtual transaction, it still runs as part of the current one.
                const span = tracer.startSpan(`Virtual PG Transaction: ${name}`, {
                  kind: SpanKind.INTERNAL,
                });

                try {
                  return context.with(trace.setSpan(context.active(), span), async () => {
                    return handler(this);
                  });
                } catch (err) {
                  span.setAttribute('error', 'true');

                  if (err instanceof Error) {
                    span.setAttribute('error.type', err.name);
                    span.setAttribute('error.message', err.message);
                    span.setStatus({
                      code: SpanStatusCode.ERROR,
                      message: err.message,
                    });
                  }

                  throw err;
                }
              },
            });
          } catch (err) {
            span.setAttribute('error', 'true');

            if (err instanceof Error) {
              span.setAttribute('error.type', err.name);
              span.setAttribute('error.message', err.message);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message,
              });
            }

            throw err;
          } finally {
            span.end();
          }
        });
      }),
      'pg',
    );
  }

  end(): Promise<void> {
    return this.pool.end();
  }
}

const dbInterceptors: Interceptor[] = [createQueryLoggingInterceptor()];

const typeParsers = [
  ...createTypeParserPreset().filter(parser => parser.name !== 'int8'),
  {
    name: 'int8',
    parse: (value: string) => parseInt(value, 10),
  },
];

export async function createPostgresDatabasePool(args: {
  /** A static connection string, PostgresConnectionParamaters, or a ConnectionStringProvider that generates a fresh token per connection. */
  connectionParameters: PostgresConnectionParamaters | string | ConnectionStringProvider;
  maximumPoolSize?: number;
  additionalInterceptors?: Interceptor[];
  statementTimeout?: number;
}) {
  const provider =
    typeof args.connectionParameters === 'function'
      ? (args.connectionParameters as ConnectionStringProvider)
      : null;

  const connectionString = provider
    ? await provider()
    : typeof args.connectionParameters === 'string'
      ? args.connectionParameters
      : createConnectionString(args.connectionParameters as PostgresConnectionParamaters);

  const pool = await createPool(connectionString, {
    interceptors: dbInterceptors.concat(args.additionalInterceptors ?? []),
    typeParsers,
    captureStackTrace: false,
    maximumPoolSize: args.maximumPoolSize,
    idleTimeout: 30000,
    statementTimeout: args.statementTimeout,
    // Already the default in slonik 48.19; pinned so the spans the old slonik.patch stripped
    // cannot come back with a default flip.
    tracing: false,
    // Slonik asks for the password on every new connection, so a rotated IAM token is picked up
    // without recreating the pool. parseDsn is what slonik uses on the connection string itself.
    ...(provider ? { password: async () => parseDsn(await provider()).password ?? '' } : {}),
  });

  function interceptError<K extends Exclude<keyof SlonikCommonQueryMethods, 'transaction'>>(
    methodName: K,
  ) {
    const original: SlonikCommonQueryMethods[K] = pool[methodName];

    function interceptor(
      this: any,
      sql: QuerySqlToken<any>,
      values?: PrimitiveValueExpression[],
    ): any {
      return (original as any).call(this, sql, values).catch((error: any) => {
        error.sql = sql.sql;
        error.values = sql.values || values;

        return Promise.reject(error);
      });
    }

    pool[methodName] = interceptor as any;
  }

  interceptError('one');
  interceptError('many');

  return new PostgresDatabasePool(pool);
}
