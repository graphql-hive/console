import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Kind, parse, type DocumentNode, type OperationDefinitionNode } from 'graphql';

export type PersistedOperation = {
  name: string;
  kind: OperationDefinitionNode['operation'];
  document: DocumentNode;
  operation: OperationDefinitionNode;
  source: string;
};

const MANIFEST = fileURLToPath(new URL('../../gql/persisted-documents.json', import.meta.url));

/**
 * Every operation the app can send, straight from the persisted-documents manifest.
 * Many entries begin with fragments, so the operation is located by parsing.
 */
export function loadPersistedOperations(): PersistedOperation[] {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>;
  const seen = new Set<string>();
  const out: PersistedOperation[] = [];

  for (const source of Object.values(manifest)) {
    const document = parse(source);
    const operation = document.definitions.find(
      (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
    );
    if (!operation?.name) continue;
    const name = operation.name.value;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, kind: operation.operation, document, operation, source });
  }

  return out;
}
