import fs from 'node:fs';
import path from 'node:path';
import { getPackages } from '@manypkg/get-packages';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const CHANGESET_DIR = path.join(ROOT_DIR, '.changeset');
const CHANGESET_CONFIG = path.join(CHANGESET_DIR, 'config.json');

export interface ValidationError {
  file: string;
  message: string;
}

export function parseChangesetFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

export function parsePackageEntries(
  frontmatter: string,
): Array<{ packageName: string; bumpType: string } | { error: string; line: string }> {
  const packageLines = frontmatter.split('\n').filter(line => line.trim());
  const results: Array<
    { packageName: string; bumpType: string } | { error: string; line: string }
  > = [];

  for (const line of packageLines) {
    const packageMatch = line.match(/^['"]?([^'":\s]+)['"]?\s*:\s*(patch|minor|major)$/);
    if (!packageMatch) {
      results.push({ error: 'parse_error', line });
    } else {
      results.push({ packageName: packageMatch[1], bumpType: packageMatch[2] });
    }
  }

  return results;
}

export function isPackageIgnored(packageName: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return packageName.startsWith(prefix);
    }
    return packageName === pattern;
  });
}

export function validateChangeset(
  fileName: string,
  content: string,
  validPackageNames: Set<string>,
  ignorePatterns: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const frontmatter = parseChangesetFrontmatter(content);
  if (frontmatter === null) {
    errors.push({ file: fileName, message: 'Could not parse frontmatter' });
    return errors;
  }

  if (!frontmatter.trim()) {
    errors.push({ file: fileName, message: 'Changeset has no packages listed' });
    return errors;
  }

  const entries = parsePackageEntries(frontmatter);

  if (entries.length === 0) {
    errors.push({ file: fileName, message: 'Changeset has no packages listed' });
    return errors;
  }

  for (const entry of entries) {
    if ('error' in entry) {
      errors.push({ file: fileName, message: `Could not parse line: ${entry.line}` });
      continue;
    }

    const { packageName } = entry;

    if (!validPackageNames.has(packageName)) {
      errors.push({
        file: fileName,
        message:
          `Package "${packageName}" does not exist in the monorepo.\n` +
          `  Valid packages are:\n${Array.from(validPackageNames)
            .sort()
            .map(p => `    - ${p}`)
            .join('\n')}`,
      });
      continue;
    }

    if (isPackageIgnored(packageName, ignorePatterns)) {
      errors.push({
        file: fileName,
        message:
          `Package "${packageName}" is in the changeset ignore list.\n` +
          `  Ignored patterns: ${ignorePatterns.join(', ')}\n` +
          `  This package doesn't need a changeset entry.`,
      });
    }
  }

  return errors;
}

function readConfig(): { ignore: string[] } {
  let configContent: string;
  try {
    configContent = fs.readFileSync(CHANGESET_CONFIG, 'utf-8');
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      console.error(`Changeset config not found at ${CHANGESET_CONFIG}.`);
    } else {
      console.error(`Failed to read changeset config: ${nodeErr.message}`);
    }
    process.exit(1);
  }

  let config: unknown;
  try {
    config = JSON.parse(configContent);
  } catch {
    console.error(
      `Failed to parse changeset config at ${CHANGESET_CONFIG}.\n` +
        `The JSON appears to be malformed.`,
    );
    process.exit(1);
  }

  if (typeof config !== 'object' || config === null) {
    console.error(`Invalid changeset config: expected an object.`);
    process.exit(1);
  }

  const configObj = config as Record<string, unknown>;
  const ignore = configObj.ignore;

  if (ignore !== undefined) {
    if (!Array.isArray(ignore) || !ignore.every(item => typeof item === 'string')) {
      console.error(
        `Invalid changeset config: "ignore" must be an array of strings.\n` +
          `Check ${CHANGESET_CONFIG}.`,
      );
      process.exit(1);
    }
    return { ignore };
  }

  return { ignore: [] };
}

function readChangesetFiles(): string[] {
  let files: string[];
  try {
    files = fs.readdirSync(CHANGESET_DIR);
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      console.error(`Changeset directory not found at ${CHANGESET_DIR}.`);
    } else {
      console.error(`Failed to read changeset directory: ${nodeErr.message}`);
    }
    process.exit(1);
  }

  return files.filter(file => file.endsWith('.md') && file !== 'README.md');
}

async function main() {
  let packages: Awaited<ReturnType<typeof getPackages>>['packages'];
  try {
    ({ packages } = await getPackages(ROOT_DIR));
  } catch (err) {
    console.error(
      `Failed to discover monorepo packages from ${ROOT_DIR}.\n` +
        `Ensure package.json exists and workspace configuration is valid.\n` +
        `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  const validPackageNames = new Set(packages.map(pkg => pkg.packageJson.name));
  const config = readConfig();
  const changesetFiles = readChangesetFiles();

  if (changesetFiles.length === 0) {
    console.log('No changesets found.');
    process.exit(0);
  }

  const allErrors: ValidationError[] = [];

  for (const file of changesetFiles) {
    const filePath = path.join(CHANGESET_DIR, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      allErrors.push({
        file,
        message: `Could not read file: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    const errors = validateChangeset(file, content, validPackageNames, config.ignore);
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    console.error('Changeset validation failed:\n');
    for (const error of allErrors) {
      console.error(`${error.file}: ${error.message}\n`);
    }
    process.exit(1);
  }

  console.log(`All ${changesetFiles.length} changesets validated successfully.`);
}

// Only run main when executed directly, not when imported for testing
const isMain = process.argv[1] === import.meta.filename;
if (isMain) {
  main().catch(err => {
    console.error(
      `Unexpected error during changeset validation:\n` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
}
