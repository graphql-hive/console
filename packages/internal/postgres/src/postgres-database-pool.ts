import {
  createPool,
  type DatabasePool,
  type Interceptor,
  type PrimitiveValueExpression,
  type QueryResultRow,
  type QueryResultRowColumn,
  type CommonQueryMethods as SlonikCommonQueryMethods,
  type TaggedTemplateLiteralInvocation,
} from 'slonik';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';
import { context, SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import { createConnectionString, type PostgresConnectionParamaters } from './connection-string';

const tracer = trace.getTracer('storage');

export interface CommonQueryMethods {
  exists(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<boolean>;
  any(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<unknown>>;
  maybeOne(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown>;
  query(sql: TaggedTemplateLiteralInvocation, values?: PrimitiveValueExpression[]): Promise<void>;
  oneFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown>;
  one(sql: TaggedTemplateLiteralInvocation, values?: PrimitiveValueExpression[]): Promise<unknown>;
  anyFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<unknown>>;
  maybeOneFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown>;
}

export class PostgresDatabasePool implements CommonQueryMethods {
  constructor(private pool: DatabasePool) {}

  /** Retrieve the raw PgPool instance. Refrain from using this API. It only exists for postgraphile workers */
  getRawPgPool() {
    return this.pool.pool;
  }

  /** Retrieve the raw Slonik instance. Refrain from using this API. */
  getSlonikPool() {
    return this.pool;
  }

  async exists(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<boolean> {
    return this.pool.exists(sql, values);
  }

  async any(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<unknown>> {
    return this.pool.any<unknown>(sql, values);
  }

  async maybeOne(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown> {
    return this.pool.maybeOne(sql, values);
  }

  async query(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<void> {
    await this.pool.query<unknown>(sql, values);
  }

  async oneFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown> {
    return await this.pool.oneFirst(sql, values);
  }

  async maybeOneFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown> {
    return await this.pool.maybeOneFirst(sql, values);
  }

  async one(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<unknown> {
    return await this.pool.one(sql, values);
  }

  async anyFirst(
    sql: TaggedTemplateLiteralInvocation,
    values?: PrimitiveValueExpression[],
  ): Promise<ReadonlyArray<unknown>> {
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
            async exists(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<boolean> {
              return methods.exists(sql, values);
            },
            async any(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<ReadonlyArray<unknown>> {
              return methods.any<unknown>(sql, values);
            },
            async maybeOne(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<unknown> {
              return methods.maybeOne(sql, values);
            },
            async query(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<void> {
              await methods.query<unknown>(sql, values);
            },
            async oneFirst(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<unknown> {
              return await methods.oneFirst(sql, values);
            },
            async maybeOneFirst(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<unknown> {
              return await methods.maybeOneFirst(sql, values);
            },
            async anyFirst(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<ReadonlyArray<unknown>> {
              return await methods.anyFirst(sql, values);
            },
            async one(
              sql: TaggedTemplateLiteralInvocation,
              values?: PrimitiveValueExpression[],
            ): Promise<unknown> {
              return await methods.one(sql, values);
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
    });
  }

  end(): Promise<void> {
    return this.pool.end();
  }
}

const dbInterceptors: Interceptor[] = [createQueryLoggingInterceptor()];

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
    captureStackTrace: false,
    maximumPoolSize: args.maximumPoolSize,
    idleTimeout: 30000,
    statementTimeout: args.statementTimeout,
  });

  function interceptError<K extends Exclude<keyof SlonikCommonQueryMethods, 'transaction'>>(
    methodName: K,
  ) {
    const original: SlonikCommonQueryMethods[K] = pool[methodName];

    function interceptor<T extends QueryResultRow>(
      this: any,
      sql: TaggedTemplateLiteralInvocation<T>,
      values?: QueryResultRowColumn[],
    ): any {
      return (original as any).call(this, sql, values).catch((error: any) => {
        error.sql = sql.sql;
        error.values = sql.values || values;

        return Promise.reject(error);
      });
    }

    pool[methodName] = interceptor;
  }

  interceptError('one');
  interceptError('many');

  return new PostgresDatabasePool(pool);
}
