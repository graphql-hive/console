import type { SuperGraphOwnership } from './federation-super-graph';

/**
 * Upper bound on the coordinates a subgraph may resolve to before a filter refuses it.
 * ClickHouse receives bound parameters in the request URL, so a very large coordinate
 * list risks the server's URI size limit. Shared by the API and the alert evaluator so
 * both refuse the same scopes.
 */
export const MAX_RESOLVED_SUBGRAPH_COORDINATES = 3000;

/**
 * Resolves subgraph names to the object and interface field coordinates they own.
 *
 * Only field coordinates are returned: type-level, enum-value and input-field ownership
 * is shared by every subgraph that declares the type, so matching on it would attribute
 * an operation to subgraphs the router never calls. Shared key fields are still owned by
 * every subgraph that declares the key. Names match case-insensitively, as Hive lowercases
 * service names at publish.
 */
export function fieldCoordinatesOwnedBy(
  info: SuperGraphOwnership,
  subgraphNames: readonly string[],
): { coordinates: string[]; unknownSubgraphs: string[] } {
  const wanted = new Set(subgraphNames.map(name => name.toLowerCase()));
  const known = new Set<string>();
  const coordinates: string[] = [];

  for (const [coordinate, services] of info.schemaCoordinateServicesMappings) {
    let owned = false;
    for (const service of services) {
      const normalized = service.toLowerCase();
      if (wanted.has(normalized)) {
        known.add(normalized);
        owned = true;
      }
    }
    if (owned && info.objectFieldCoordinates.has(coordinate)) {
      coordinates.push(coordinate);
    }
  }

  return {
    coordinates: coordinates.sort((a, b) => a.localeCompare(b)),
    unknownSubgraphs: subgraphNames.filter(name => !known.has(name.toLowerCase())),
  };
}

/**
 * Small bounded cache keyed by schema version id. A version's supergraph never changes,
 * so parsing it once per process is enough; insertion-order eviction keeps memory flat.
 */
export function createOwnershipCache<T = SuperGraphOwnership>(max = 200) {
  const entries = new Map<string, T>();
  return {
    get(versionId: string): T | undefined {
      return entries.get(versionId);
    },
    set(versionId: string, value: T): void {
      entries.set(versionId, value);
      if (entries.size > max) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) {
          entries.delete(oldest);
        }
      }
    },
  };
}
