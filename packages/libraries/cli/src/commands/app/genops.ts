import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { print } from 'graphql';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments } from '@graphql-tools/load';
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

    let sources;
    try {
      sources = await loadDocuments(`${dir}/**/*.graphql`, {
        loaders: [new GraphQLFileLoader()],
      });
    } catch (err) {
      this.error(
        `Failed to load GraphQL files from "${relative(process.cwd(), dir)}": ${String(err)}`,
      );
    }

    if (sources.length === 0) {
      this.error(`No .graphql files found in "${relative(process.cwd(), dir)}".`);
    }

    // sort by location to make the output deterministic
    sources.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''));

    const manifest: Record<string, string> = {};

    for (const source of sources) {
      const file = source.location ?? '<unknown>';
      if (!source.document) {
        this.warn(`Skipping empty operation in file "${relative(process.cwd(), file)}".`);
        continue;
      }
      // print to normalize the document (removes comments), then collapse whitespace
      const operation = print(source.document).replace('\n', ' ').replace(/\s+/g, ' ').trim();
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
