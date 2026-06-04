import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
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
    const files = await findGraphQLFiles(dir);

    if (files.length === 0) {
      this.error(`No .graphql files found in "${dir}".`);
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
      const hash = createHash('sha256').update(operation).digest('hex');
      manifest[hash] = operation;
    }

    writeFileSync(flags.out, JSON.stringify(manifest, null, 2), 'utf-8');

    this.logSuccess(
      `Generated persisted operations manifest with ${Object.keys(manifest).length} operation(s) to "${flags.out}".`,
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
