import { BackendTerminatedError, DatabasePool, DatabasePoolConnection, sql } from 'slonik';

export function createConnectionString(config: {
  host: string;
  port: number;
  password: string | undefined;
  user: string;
  db: string;
  ssl: boolean;
}) {
  // prettier-ignore
  const encodedUser = encodeURIComponent(config.user);
  const encodedPassword =
    typeof config.password === 'string' ? `:${encodeURIComponent(config.password)}` : '';
  const encodedHost = encodeURIComponent(config.host);
  const encodedDb = encodeURIComponent(config.db);

  return `postgres://${encodedUser}${encodedPassword}@${encodedHost}:${config.port}/${encodedDb}${config.ssl ? '?sslmode=require' : '?sslmode=disable'}`;
}

export function toDate(date: Date) {
  return sql`to_timestamp(${date.getTime() / 1000})`;
}

export type CancellableConnectionRoutine<T> = (
  connection: DatabasePoolConnection,
  cancel: () => Promise<void>,
) => Promise<T>;

export async function cancellableConnection<T>(
  pool: DatabasePool,
  cancellableConnectionRoutine: CancellableConnectionRoutine<T>,
): Promise<T> {
  let done = false;

  return pool.connect(async connection0 => {
    return pool.connect(async connection1 => {
      const backendProcessId = await connection1.oneFirst(sql`SELECT pg_backend_pid()`);

      const cancel = async () => {
        if (done) {
          return;
        }

        done = true;

        return connection0
          .query(
            sql`
          SELECT pg_terminate_backend(${backendProcessId})
        `,
          )
          .then(_queryResult => {
            return;
          })
          .catch((error: unknown) => {
            if (!(error instanceof BackendTerminatedError)) {
              throw error;
            }
          });
      };

      let result: T;

      try {
        result = await cancellableConnectionRoutine(connection1, cancel);

        done = true;
      } catch (error) {
        done = true;

        throw error;
      }

      return result;
    });
  });
}
