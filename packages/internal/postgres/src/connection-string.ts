export type PostgresConnectionParamaters = {
  host: string;
  port: number;
  password: string | undefined;
  user: string;
  db: string;
  ssl: boolean;
};

/** Create a Postgres Connection String */
export function createConnectionString(config: PostgresConnectionParamaters) {
  // prettier-ignore
  const encodedUser = encodeURIComponent(config.user);
  const encodedPassword =
    typeof config.password === 'string' ? `:${encodeURIComponent(config.password)}` : '';
  const encodedHost = encodeURIComponent(config.host);
  const encodedDb = encodeURIComponent(config.db);

  return `postgres://${encodedUser}${encodedPassword}@${encodedHost}:${config.port}/${encodedDb}${config.ssl ? '?sslmode=require' : '?sslmode=disable'}`;
}

/**
 * An async function that returns a fresh connection string on each call.
 * When backed by IAM auth, each call generates a new short-lived token.
 */
export type ConnectionStringProvider = () => Promise<string>;

/**
 * Create a ConnectionStringProvider that generates a fresh connection string on each call.
 *
 * @param config - Postgres connection parameters
 * @param tokenGenerator - When provided, called on each invocation to produce a password
 *   (e.g. an RDS IAM auth token). When omitted, returns a static connection string.
 */
export function createConnectionStringProvider(
  config: PostgresConnectionParamaters,
  tokenGenerator?: () => Promise<string>,
): ConnectionStringProvider {
  if (tokenGenerator) {
    return async () => {
      const token = await tokenGenerator();
      return createConnectionString({ ...config, password: token });
    };
  }

  const connectionString = createConnectionString(config);
  return async () => connectionString;
}
