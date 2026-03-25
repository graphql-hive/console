import type { Client, Pool } from 'pg';
import { sql, type DatabasePool, type DatabasePoolConnection } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';

/** Bridge {slonik.DatabasePool} to an {pg.Pool} */
export class PgPoolBridge implements Pool {
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

  /** Postgraphile allocates a single connection before executing statements. So we mimic the API here */
  async connect(): Promise<PgClientBridge> {
    const d = Promise.withResolvers<any>();
    const r = Promise.withResolvers<void>();

    // Slonik connect works in a way where the client is reserved for the Promise returned in the handler.
    // We need to be a bit more creative to support the "pg.Pool" API :)
    this.pool.connect(async client => {
      d.resolve(new PgClientBridge(client, r.resolve));
      await r.promise;
    });

    return d.promise;
  }

  query(query: any, values: any): any {
    return this.pool.query(sql.unsafe`${raw(query, values)}`);
  }

  on(): any {
    // TODO: figure out which events are used by postgraphile workers and handle these
    // throw new Error('Not implemented. PgPoolBridge.on');
  }
}

class PgClientBridge implements Client {
  constructor(
    private connection: DatabasePoolConnection,
    public release: () => void,
  ) {}
  connect(): never {
    throw new Error('Not implemented.');
  }

  query(query: any, values: any): any {
    if (query?.text) {
      return this.connection.query(sql.unsafe`${raw(query.text, query.values)}`);
    }

    return this.connection.query(sql.unsafe`${raw(query, values)}`);
  }
}
