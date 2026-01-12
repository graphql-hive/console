import { isTypeDefinitionNode, isTypeExtensionNode, Kind, type DocumentNode } from 'graphql';

/**
 * Apollo Link spec v1.0 reserved type identifiers.
 * https://specs.apollo.dev/link/v1.0/
 *
 * - Purpose: An enum type used by @link to specify link purposes (SECURITY, EXECUTION)
 * - Import: A scalar type used by @link for import specifications
 *
 * These types are automatically defined when a schema uses the @link directive
 * for Apollo Federation v2. User-defined types with these names will conflict.
 */
export const LINK_SPEC_RESERVED_TYPES = new Set(['Purpose', 'Import']);

/**
 * Apollo Link spec v1.0 reserved directive names.
 * https://specs.apollo.dev/link/v1.0/
 *
 * User-defined directives with these names will conflict when the schema
 * uses Apollo Federation v2, which automatically imports these directives.
 */
export const LINK_SPEC_RESERVED_DIRECTIVES = new Set(['link']);

export interface LinkSpecConflict {
  name: string;
  kind: 'type' | 'directive';
  message: string;
}

/**
 * Validates that a schema doesn't define types or directives that conflict
 * with Apollo Link spec reserved identifiers.
 *
 * IMPORTANT: This function validates unconditionally. The caller is responsible for
 * ensuring this validation is only applied to Federation v2 schemas or schemas using
 * the @link directive. Non-federation and Federation v1 schemas can freely use these names.
 *
 * @param documentNode - The parsed GraphQL document to validate
 * @returns Array of conflicts found, empty if no conflicts
 */
export function validateLinkSpecReservedTypes(documentNode: DocumentNode): LinkSpecConflict[] {
  const conflicts: LinkSpecConflict[] = [];

  for (const definition of documentNode.definitions) {
    // Check type definitions (enum, scalar, type, interface, union, input)
    if (isTypeDefinitionNode(definition) || isTypeExtensionNode(definition)) {
      const typeName = definition.name.value;
      if (LINK_SPEC_RESERVED_TYPES.has(typeName)) {
        conflicts.push({
          name: typeName,
          kind: 'type',
          message:
            `Type "${typeName}" conflicts with Apollo Link spec reserved type ` +
            `(https://specs.apollo.dev/link/v1.0/). Please rename your type.`,
        });
      }
    }

    // Check directive definitions
    if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
      const directiveName = definition.name.value;
      if (LINK_SPEC_RESERVED_DIRECTIVES.has(directiveName)) {
        conflicts.push({
          name: directiveName,
          kind: 'directive',
          message:
            `Directive "@${directiveName}" conflicts with Apollo Link spec reserved directive ` +
            `(https://specs.apollo.dev/link/v1.0/). Please rename your directive.`,
        });
      }
    }
  }

  return conflicts;
}
