import type { IntrospectionQuery } from 'graphql';
import type { MonacoGraphQLAPI } from 'monaco-graphql/esm/api.js';
import { initializeMode } from 'monaco-graphql/initializeMode';

/**
 * monaco-graphql's initializeMode is a module-level singleton: it ignores the
 * config of every call after the first. Editors mount in an arbitrary order and
 * only the operation editor knows about a variables model, so initialising from
 * whichever editor happens to be first loses that mapping. Everything goes
 * through here instead, and updates use the setters rather than re-initialising.
 */
let api: MonacoGraphQLAPI | null = null;

/** validateVariablesJSON is mode-wide, so mappings accumulate instead of replacing. */
const variablesByOperationUri = new Map<string, string>();

export type SyncMonacoGraphQLInput = {
  introspection: IntrospectionQuery;
  schemaUri: string;
  operationUri?: string;
  variablesUri?: string;
};

export function syncMonacoGraphQL(input: SyncMonacoGraphQLInput): MonacoGraphQLAPI {
  if (input.operationUri && input.variablesUri) {
    variablesByOperationUri.set(input.operationUri, input.variablesUri);
  }

  const schemas = [{ introspectionJSON: input.introspection, uri: input.schemaUri }];

  const diagnosticSettings = {
    validateVariablesJSON: Object.fromEntries(
      [...variablesByOperationUri].map(([operationUri, variablesUri]) => [
        operationUri,
        [variablesUri],
      ]),
    ),
    // Allow json, parsed with a jsonc parser to make requests.
    jsonDiagnosticSettings: { allowComments: true },
  };

  if (!api) {
    api = initializeMode({ schemas, diagnosticSettings });
    api.setCompletionSettings({ __experimental__fillLeafsOnComplete: true });

    return api;
  }

  api.setSchemaConfig(schemas);
  api.setDiagnosticSettings(diagnosticSettings);

  return api;
}

/** Test seam: clears the module-level mode and its accumulated mappings. */
export function resetMonacoGraphQLForTests(): void {
  api = null;
  variablesByOperationUri.clear();
}
