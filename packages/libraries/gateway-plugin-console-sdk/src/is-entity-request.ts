import type { DocumentNode } from 'graphql';

/**
 * Checks if the top-level selection is an '_entities' query
 */
export function isEntityRequest(document: DocumentNode) {
  let isEntityRequest = false;
  const operation = document.definitions.find(def => def.kind === 'OperationDefinition');

  if (operation && operation.selectionSet) {
    isEntityRequest = operation.selectionSet.selections.some(
      selection => selection.kind === 'Field' && selection.name.value === '_entities',
    );
  }
  return isEntityRequest;
}
