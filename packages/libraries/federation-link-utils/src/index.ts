import type { DocumentNode } from 'graphql';
import { FederatedLink } from './link.js';
import { FEDERATION_V1, type LinkableSpec } from './linkable-spec.js';

export * from './link-import.js';
export * from './link-url.js';
export * from './link.js';
export * from './linkable-spec.js';

const FEDERATION_IDENTITY = 'https://specs.apollo.dev/federation';

export function detectLinkedImplementations<T>(
  typeDefs: DocumentNode,
  supportedSpecs: LinkableSpec<T>[],
): T[] {
  const links = FederatedLink.fromTypedefs(typeDefs);
  const supportsFederationV2 = links.some(l => l.identity === FEDERATION_IDENTITY);

  return supportedSpecs
    .map(spec => {
      if (!supportsFederationV2) {
        const resolveFed1Name = (name: string) => {
          return name.startsWith('@') ? name.substring(1) : name;
        };
        return spec.versions[FEDERATION_V1]?.(resolveFed1Name);
      }

      const specImpl = spec.detectImplementation(links);
      return specImpl;
    })
    .filter(v => v !== undefined);
}
