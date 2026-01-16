/**
 * Utility script for simply bumping the version for self-hosting in our getting started guide.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const filePath = path.join(
  __dirname,
  '..',
  'packages/web/docs/src/content/schema-registry/self-hosting/get-started.mdx',
);

console.log('read self-hosting version');

const packageJSONFilePath = path.join(__dirname, '..', 'deployment/package.json');
const newVersion = JSON.parse(await fs.readFile(packageJSONFilePath, 'utf-8')).version;

console.log(`current self-hosting version: ${newVersion}`);

const dockerComposeFileUrlPartRegex = /\/hive@\d+\.\d+\.\d+\//g;
const environmentVariablePartRegex = /DOCKER_TAG=":\d+\.\d+\.\d+"/g;

console.log(`replace self-hosting version reference in documentation`);

const contents = await fs.readFile(filePath, 'utf-8');

const result = contents
  .replace(dockerComposeFileUrlPartRegex, `/hive@${newVersion}/`)
  .replace(environmentVariablePartRegex, `DOCKER_TAG=":${newVersion}"`);

await fs.writeFile(filePath, result, 'utf-8');

console.log(`finished`);
