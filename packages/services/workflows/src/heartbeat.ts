import fs from 'node:fs/promises';
import path from 'path';
import { Logger } from '@graphql-hive/logger';

/** Write latest date to filesystem for docker health check */
export async function startHeartbeat(logger: Logger) {
  const file = '/tmp/hive_worker_heartbeat';
  const intervalMs = 10_000;

  const dir = path.dirname(file);

  // Make sure directory exists
  await fs.mkdir(dir, { recursive: true });

  const writeHeartbeat = async () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      await fs.writeFile(file, timestamp);
    } catch (errror) {
      logger.error({ errror }, 'Heartbeat write failed:');
    }

    setTimeout(writeHeartbeat, intervalMs).unref();
  };

  writeHeartbeat();
}
