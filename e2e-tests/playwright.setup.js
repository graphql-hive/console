import * as Path from 'node:path';
import dotenv from 'dotenv';

/**
 * @see https://playwright.dev/docs/test-configuration#global-setup
 */
export default async _config => {
  const path = process.env.CI
    ? Path.join(import.meta.dirname, '../integration-tests/.env')
    : Path.join(import.meta.dirname, '../packages/services/server/.env.template');

  dotenv.config({ path });

  if (!process.env.CI) {
    process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
  }
};
