/**
 * Exposes a simple and efficient API for interacting with Federation V2's `@link` directives
 * according to spec.
 */

import type { DocumentNode } from 'graphql';
import { FederatedLink } from './link.js';

const FEDERATION_IDENTITY = 'https://specs.apollo.dev/federation';

export const FEDERATION_V1 = Symbol('Federation_V1');

export type LinkVersion = string | { major: number; minor: number } | null | typeof FEDERATION_V1;

export function extractLinkImplementations(typeDefs: DocumentNode): {
  /**
   *
   * @param identity The link identity. E.g. https://specs.apollo.dev/link/v1.0
   * @param name The imported object name, without namespacing. E.g. "@link"
   * @returns The imported object's name within the typedefs. E.g.
   *   For `@link(url: "https://example.com/", import: [{ name: "@example", as: "@eg" }])`,
   *   `resolveImportName("@example")` returns "eg".
   *   And for `@link(url: "https://example.com/foo")`, `resolveImportName("@example")`
   *   returns the namespaced name, "foo__example"
   */
  resolveImportName: (identity: string, name: string) => string;

  /**
   * Check that the linked version is supported by the code implementation.
   *
   * @param identity The link identity. E.g. https://specs.graphql-hive.com/example
   * @param version The version in which the feature was added. E.g. 1.0
   * @returns true if the supplied link supports this the version argument.
   *   E.g. matchesImplementation('https://specs.graphql-hive.com/example', '1.1') returns true if
   *   is version >= 1.1 < 2.0, but false if the link is version 1.0
   */
  matchesImplementation: (identity: string, version: LinkVersion) => boolean;
} {
  const linkByIdentity = Object.fromEntries(
    FederatedLink.fromTypedefs(typeDefs).map(l => [l.identity, l]),
  );
  const supportsFederationV2 = linkByIdentity[FEDERATION_IDENTITY] !== undefined;

  return {
    resolveImportName: (identity, name) => {
      if (!supportsFederationV2) {
        // @note identities dont matter for Federation v1. There are no links to reference.
        return name.startsWith('@') ? name.substring(1) : name;
      }

      const matchingLink = linkByIdentity[identity];
      if (!matchingLink) {
        throw new Error(
          'Cannot resolve import name for unlinked resource. Be sure to use check that an identity is implemented using "matchesImplementation" before trying to resolve import name.',
        );
      }
      return matchingLink.resolveImportName(name);
    },
    matchesImplementation: (identity, version) => {
      if (version === FEDERATION_V1) {
        return !supportsFederationV2;
      }
      const matchingLink = linkByIdentity[identity];
      if (!matchingLink) {
        return false;
      }
      if (typeof version === 'string') {
        return matchingLink.supports(version);
      }
      if (version === null) {
        return matchingLink.supports(version);
      }
      return matchingLink.supports(version.major, version.minor);
    },
  };
}
