import type { PoolClient } from 'pg';
import { sql, type DatabasePool, type DatabasePoolConnection } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';

/** Bridge {slonik.DatabasePool} to an {pg.Pool} for usage with Postgraphile Workers. */
export class PgPoolBridge {
  constructor(private pool: DatabasePool) {}

  get totalCount() {
    return this.pool.state().acquiredConnections + this.pool.state().pendingConnections;
  }
  get idleCount() {
    return this.pool.state().idleConnections;
  }
  get waitingCount() {
    return 0;
  }
  get expiredCount() {
    return 0;
  }
  get ending() {
    return false;
  }
  get ended() {
    return false;
  }

  end(): never {
    throw new Error('Not implemented.');
  }

  async connect(): Promise<PoolClient> {
    const pgClientAvailableP = Promise.withResolvers<any>();
    const pgClientReleasedP = Promise.withResolvers<void>();

    // Slonik connect works in a way where the client is reserved for the Promise returned in the handler.
    // We need to be a bit more creative to support the "pg.Pool" API :)
    this.pool.connect(async client => {
      pgClientAvailableP.resolve(new PgClientBridge(client, pgClientReleasedP.resolve));
      await pgClientReleasedP.promise;
    });

    return pgClientAvailableP.promise;
  }

  query(query: unknown, values?: unknown, callback?: unknown): any {
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

  on(event: unknown, handler: unknown): this {
    if (event === 'error') {
      this.pool.on('error', handler as any);
    } else if (event !== 'connect') {
      // Note: we can skip connect, as slonik already handles these errors gracefully.
      throw new Error(`Not implemented. PgPoolBridge.on("${event}")`);
    }
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
