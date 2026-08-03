import { createServer } from 'node:http';
import process from 'node:process';
import { resolveEnv } from './environment';
import { createRequestListener } from './server';

// eslint-disable-next-line no-process-env
const env = resolveEnv(process.env);
const server = createServer(createRequestListener(env));

function formatListenAddress(host: string, port: number) {
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
}

server.listen(
  {
    port: env.http.port,
    host: env.http.host,
    ipv6Only: env.http.ipv6Only,
  },
  () => {
    console.log(`Listening on ${formatListenAddress(env.http.host, env.http.port)}`);
  },
);

process.on('SIGINT', () => {
  server.close(err => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
});
