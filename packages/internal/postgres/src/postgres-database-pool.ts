import type { Pool } from 'pg';
import {
  createPool,
  createTypeParserPreset,
  type DatabasePool,
  type Interceptor,
  type PrimitiveValueExpression,
  type QuerySqlToken,
  type CommonQueryMethods as SlonikCommonQueryMethods,
} from 'slonik';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';
import { context, SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createConnectionString, type PostgresConnectionParamaters } from './connection-string';
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
    return this.pool.exists(sql, values);
  }

  async any<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<StandardSchemaV1.InferOutput<T>>> {
    return this.pool.any(sql, values);
  }

  async maybeOne<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>> {
    return this.pool.maybeOne(sql, values);
  }

  async query(sql: QuerySqlToken<any>, values?: PrimitiveValueExpression[]): Promise<void> {
    await this.pool.query(sql, values);
  }

  async oneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]> {
    return await this.pool.oneFirst(sql, values);
  }

  async maybeOneFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<null | StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]> {
    return await this.pool.maybeOneFirst(sql, values);
  }

  async one<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<StandardSchemaV1.InferOutput<T>> {
    return await this.pool.one(sql, values);
  }

  async anyFirst<T extends StandardSchemaV1>(
    sql: QuerySqlToken<T>,
    values?: PrimitiveValueExpression[],
  ): Promise<
    ReadonlyArray<StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>]>
  > {
    return await this.pool.anyFirst(sql, values);
  }

  async transaction<T = void>(
    name: string,
    handler: (methods: CommonQueryMethods) => Promise<T>,
  ): Promise<T> {
    const span = tracer.startSpan(`PG Transaction: ${name}`, {
      kind: SpanKind.INTERNAL,
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      return await this.pool.transaction(async methods => {
        try {
          return await handler({
            exists: methods.exists,
            any: methods.any,
            maybeOne: methods.maybeOne,
            async query(
              sql: QuerySqlToken<any>,
              values?: PrimitiveValueExpression[],
            ): Promise<void> {
              await methods.query(sql, values);
            },
            oneFirst: methods.oneFirst,
            maybeOneFirst: methods.maybeOneFirst,
            anyFirst: methods.anyFirst,
            one: methods.one,
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
    });
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
  connectionParameters: PostgresConnectionParamaters | string;
  maximumPoolSize?: number;
  additionalInterceptors?: Interceptor[];
  statementTimeout?: number;
}) {
  const connectionString =
    typeof args.connectionParameters === 'string'
      ? args.connectionParameters
      : createConnectionString(args.connectionParameters);
  const pool = await createPool(connectionString, {
    interceptors: dbInterceptors.concat(args.additionalInterceptors ?? []),
    typeParsers,
    captureStackTrace: false,
    maximumPoolSize: args.maximumPoolSize,
    idleTimeout: 30000,
    statementTimeout: args.statementTimeout,
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
