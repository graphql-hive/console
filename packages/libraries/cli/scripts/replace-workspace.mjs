import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;
const cliPackageJsonAt = join(__dirname, '..', 'package.json');
const corePackageJsonAt = join(__dirname, '..', '..', 'core', 'package.json');

// The PR artifacts job (release-alpha.yaml) sets this to a tarball of the locally built
// @graphql-hive/core, because the core version in package.json may not be published yet
// (or is published without the changes the CLI now relies on, e.g. a widened graphql peer range).
const coreTarball = process.env.HIVE_CORE_TARBALL;
if (coreTarball && !isAbsolute(coreTarball)) {
  throw new Error(`HIVE_CORE_TARBALL must be an absolute path, got: ${coreTarball}`);
}

const specifier = coreTarball
  ? `file:${coreTarball}`
  : JSON.parse(readFileSync(corePackageJsonAt, 'utf-8')).version;

const newPkg = readFileSync(cliPackageJsonAt, 'utf-8').replace(
  '"@graphql-hive/core": "workspace:*"',
  `"@graphql-hive/core": "${specifier}"`,
);

writeFileSync(cliPackageJsonAt, newPkg);
