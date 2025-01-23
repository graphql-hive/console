const {
  POSTGRES_USER = 'postgres',
  POSTGRES_PASSWORD = null,
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = 5432,
  POSTGRES_DB = 'registry',
  POSTGRES_SSL = null,
  POSTGRES_CONNECTION_STRING = null,
} = process.env;

function cn(dbName = POSTGRES_DB) {
  const user = encodeURIComponent(POSTGRES_USER);
  const password =
    typeof POSTGRES_PASSWORD === 'string' ? `:${encodeURIComponent(POSTGRES_PASSWORD)}` : '';
  const host = encodeURIComponent(POSTGRES_HOST);
  const dbNameEncoded = encodeURIComponent(dbName);
  const sslMode = POSTGRES_SSL ? 'require' : 'disable';

  return (
    POSTGRES_CONNECTION_STRING ||
    `postgres://${user}${password}@${host}:${POSTGRES_PORT}/${dbNameEncoded}?sslmode=${sslMode}`
  );
}

module.exports = cn;
