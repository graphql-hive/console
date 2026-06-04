import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';

export default class AppGenOps extends Command<typeof AppGenOps> {
  static description =
    'generate a persisted operations manifest from GraphQL operation files in the given directory recursively';

  static args = {
    dir: Args.string({
      name: 'dir',
      required: true,
      description: 'Path to the directory containing GraphQL operation files.',
      hidden: false,
    }),
  };

  static flags = {
    out: Flags.string({
      description: 'Path to the output JSON file for the persisted operations manifest.',
      required: false,
      default: 'persisted-operations.json',
    }),
  };

  async run() {
    const { args, flags } = await this.parse(AppGenOps);

    const dir = resolve(args.dir);

    let files;
    try {
      files = await findGraphQLFiles(dir);
    } catch (err) {
      this.error(`Failed to read directory "${relative(process.cwd(), dir)}": ${String(err)}`);
    }

    if (files.length === 0) {
      this.error(`No .graphql files found in "${relative(process.cwd(), dir)}".`);
    }

    const manifest: Record<string, string> = {};

    for (const file of files) {
      const raw = readFileSync(file, 'utf-8');
      const operation = raw
        // remove new lines
        .replace(/\n/g, ' ')
        // remove extra whitespace
        .replace(/\s+/g, ' ')
        // trim ends
        .trim();
      if (!operation) {
        this.warn(`Skipping empty operation in file "${relative(process.cwd(), file)}".`);
        continue;
      }
      const hash = createHash('sha256').update(operation).digest('hex');
      if (hash in manifest) {
        this.warn(
          `Hash collision detected for file "${relative(process.cwd(), file)}". The operation is identical to another operation already in the manifest. Skipping.`,
        );
        continue;
      }
      manifest[hash] = operation;
    }

    if (Object.keys(manifest).length === 0) {
      this.error(`No valid GraphQL operations found in "${relative(process.cwd(), dir)}".`);
    }

    writeFileSync(
      flags.out,
      JSON.stringify(manifest, null, 2) +
        // add a trailing new line just out of convention
        '\n',
      'utf-8',
    );

    this.logSuccess(
      `Generated persisted operations manifest with ${Object.keys(manifest).length} operation(s) to "${relative(process.cwd(), flags.out)}".`,
    );
  }
}

async function findGraphQLFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const fullPath = join(dir, entry.name);
      return entry.isDirectory()
        ? findGraphQLFiles(fullPath)
        : extname(entry.name) === '.graphql'
          ? fullPath
          : [];
    }),
  );
  return files.flat();
}
