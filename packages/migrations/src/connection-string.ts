export function createConnectionString(config: {
  host: string;
  port: number;
  password: string;
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
