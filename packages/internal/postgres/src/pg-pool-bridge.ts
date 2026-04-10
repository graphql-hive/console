import type { PoolClient } from 'pg';
import { sql, type DatabasePool, type DatabasePoolConnection } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';

/**
 * Bridge {slonik.DatabasePool} to an {pg.Pool} for usage with Postgraphile Workers.
 *
 * This is a very very pragmatic approach, since slonik moved away from using {pg.Pool} internally.
 * https://github.com/gajus/slonik/issues/768
 **/
export class PgPoolBridge {
  constructor(private pool: DatabasePool) {}

  end(): never {
    throw new Error('Not implemented.');
  }

  async connect(): Promise<PoolClient> {
    const pgClientAvailableP = Promise.withResolvers<any>();
    const pgClientReleasedP = Promise.withResolvers<void>();

    // slonik connect works in a way where the client is acquired for the callback handler closure only.
    // It is released once the Promise returned from the handler resolves.
    // We need to be a bit creative to support the "pg.Pool" API and obviously
    // trust graphile-workers to call the `release` method on our fake {pg.Client} :)
    // so the client is released back to the pool
    void this.pool.connect(async client => {
      pgClientAvailableP.resolve(new PgClientBridge(client, pgClientReleasedP.resolve));
      await pgClientReleasedP.promise;
    });

    return pgClientAvailableP.promise;
  }

  /** Some of graphile-workers logic just calls the `query` method on {pg.Pool} - without first acquiring a connection.  */
  query(query: unknown, values?: unknown, callback?: unknown): any {
    // not used, but just in case so we can catch it in the future...
    if (typeof callback !== 'undefined') {
      throw new Error('PgClientBridge.query: callback not supported');
    }

    if ((typeof query !== 'string' && typeof query !== 'object') || !query) {
      throw new Error('PgClientBridge.query: unsupported query input');
    }

    if (typeof query === 'string') {
      return this.pool.query(sql.unsafe`${raw(query, values as any)}`);
    }

    return this.pool.query(sql.unsafe`${raw((query as any).text as any, (query as any).values)}`);
  }

  on(): this {
    // Note: we can skip setting up event handlers, as graphile workers is only setting up error handlers to avoid uncaught exceptions
    // For us, the error handlers are already set up by slonik
    // https://github.com/graphile/worker/blob/5650fbc4406fa3ce197b2ab582e08fd20974e50c/src/lib.ts#L351-L359
    return this;
  }

  removeListener(): this {
    // Note: we can skip tearing down event handlers, since we ship setting them up in the first place
    // https://github.com/graphile/worker/blob/5650fbc4406fa3ce197b2ab582e08fd20974e50c/src/lib.ts#L351-L359
    return this;
  }
}

class PgClientBridge {
  constructor(
    private connection: DatabasePoolConnection,
    /** This is invoked for again releasing the connection. */
    public release: () => void,
  ) {}

  query(query: unknown, values?: unknown, callback?: unknown): any {
    if (typeof callback !== 'undefined') {
      throw new Error('PgClientBridge.query: callback not supported');
    }

    if ((typeof query !== 'string' && typeof query !== 'object') || !query) {
      throw new Error('PgClientBridge.query: unsupported query input');
    }

    if (typeof query === 'string') {
      return this.connection.query(sql.unsafe`${raw(query, values as any)}`);
    }

    return this.connection.query(
      sql.unsafe`${raw((query as any).text as any, (query as any).values)}`,
    );
  }
}
