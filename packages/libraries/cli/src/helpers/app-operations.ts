import { createHash } from 'node:crypto';
import { promises as fs, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { print } from 'graphql';
import { z } from 'zod';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments } from '@graphql-tools/load';
import {
  FileMissingError,
  InvalidFileContentsError,
  PersistedOperationsMalformedError,
} from './errors';

const ManifestModel = z.record(z.string());

const ApolloManifestModel = z.object({
  format: z.literal('apollo-persisted-query-manifest'),
  version: z.literal(1),
  operations: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
    }),
  ),
});

export async function loadAppOperations(file: string): Promise<{
  manifest: Record<string, string>;
  operations: Array<{ operationHash: string; content: string; location?: string }>;
  generatedFrom?: string;
  warnings: string[];
}> {
  const isFile = (() => {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  })();

  if (isFile) {
    let input: unknown;
    try {
      input = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      throw new InvalidFileContentsError(file, 'JSON persisted operations manifest');
    }
    const manifestValidationResult = ManifestModel.safeParse(input);
    let entries: Array<[string, string]>;

    if (manifestValidationResult.success) {
      entries = Object.entries(manifestValidationResult.data);
    } else {
      const apolloValidationResult = ApolloManifestModel.safeParse(input);
      if (!apolloValidationResult.success) {
        throw new PersistedOperationsMalformedError(file);
      }
      entries = apolloValidationResult.data.operations.map(operation => [
        operation.id,
        operation.body,
      ]);
    }

    const location = relative(process.cwd(), file);
    return {
      manifest: Object.fromEntries(entries),
      operations: entries.map(([operationHash, content]) => ({
        operationHash,
        content,
        location,
      })),
      warnings: [],
    };
  }

  const globPattern = (() => {
    try {
      if (statSync(file).isDirectory()) {
        return `${resolve(file)}/**/*.graphql`;
      }
    } catch {
      // Not a directory, treat it as a glob pattern.
    }
    return file;
  })();

  let sources;
  try {
    sources = await loadDocuments(globPattern, {
      loaders: [new GraphQLFileLoader()],
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'NoTypeDefinitionsFound') {
      throw new FileMissingError(
        relative(process.cwd(), file),
        file.endsWith('.json') ? 'The file does not exist.' : 'No .graphql files found.',
      );
    }
    throw new FileMissingError(
      relative(process.cwd(), file),
      `Failed to load GraphQL files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (sources.length === 0) {
    throw new FileMissingError(relative(process.cwd(), file), 'No .graphql files found.');
  }

  sources.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''));

  const manifest: Record<string, string> = {};
  const locations = new Map<string, string>();
  const warnings: string[] = [];

  for (const source of sources) {
    const sourceFile = source.location ?? '<unknown>';
    const location = relative(process.cwd(), sourceFile);
    if (!source.document) {
      warnings.push(`Skipping empty operation in file "${location}".`);
      continue;
    }
    const operation = print(source.document).replace('\n', ' ').replace(/\s+/g, ' ').trim();
    if (!operation) {
      warnings.push(`Skipping empty operation in file "${location}".`);
      continue;
    }
    const hash = createHash('sha256').update(operation).digest('hex');
    if (hash in manifest) {
      warnings.push(
        `Hash collision detected for file "${location}". The operation is identical to another operation already in the manifest. Skipping.`,
      );
      continue;
    }
    manifest[hash] = operation;
    locations.set(hash, location);
  }

  if (Object.keys(manifest).length === 0) {
    throw new PersistedOperationsMalformedError(
      relative(process.cwd(), file),
      'No valid GraphQL operations found.',
    );
  }

  return {
    manifest,
    operations: Object.entries(manifest).map(([operationHash, content]) => ({
      operationHash,
      content,
      location: locations.get(operationHash),
    })),
    generatedFrom: globPattern,
    warnings,
  };
}
