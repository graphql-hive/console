import { Injectable, Scope } from 'graphql-modules';
import {
  createOwnershipCache,
  extractSuperGraphInformation,
  fieldCoordinatesOwnedBy,
  MAX_RESOLVED_SUBGRAPH_COORDINATES,
} from '@hive/supergraph';
import { ProjectType } from '../../../shared/entities';
import { GraphStore } from '../../graph/providers/graph-store';
import { ProjectManager } from '../../project/providers/project-manager';
import { Logger } from '../../shared/providers/logger';
import { SchemaManager } from './schema-manager';
import { SchemaVersionHelper } from './schema-version-helper';

export type SubgraphFieldCoordinates =
  | { kind: 'ok'; coordinates: string[] }
  | { kind: 'not-federation' }
  | { kind: 'no-supergraph' }
  | { kind: 'unknown-subgraphs'; subgraphNames: string[] }
  | { kind: 'too-many-coordinates'; count: number };

// Keyed by schema version id, so a version is parsed once per process rather than once per
// request. The Insights page runs two operationsStats documents per interaction.
const ownershipCache = createOwnershipCache();

/**
 * Resolves subgraph names to the object and interface field coordinates they own in the
 * target's latest valid schema version. Shared by saved-filter validation and the
 * operationsStats filter so both agree on what a subgraph means.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class SubgraphOwnership {
  private logger: Logger;

  constructor(
    logger: Logger,
    private projectManager: ProjectManager,
    private graphStore: GraphStore,
    private schemaManager: SchemaManager,
    private schemaVersionHelper: SchemaVersionHelper,
  ) {
    this.logger = logger.child({ source: 'SubgraphOwnership' });
  }

  async resolveFieldCoordinates(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    subgraphNames: readonly string[];
  }): Promise<SubgraphFieldCoordinates> {
    const project = await this.projectManager.getProject({
      organizationId: args.organizationId,
      projectId: args.projectId,
    });
    if (project.type !== ProjectType.FEDERATION) {
      return { kind: 'not-federation' };
    }

    const graph = await this.graphStore.getDefaultGraphForTargetId(args.targetId);
    const version = await this.schemaManager.getMaybeLatestValidVersionForGraph(graph);
    if (!version) {
      return { kind: 'no-supergraph' };
    }

    let ownership = ownershipCache.get(version.id);
    if (!ownership) {
      const supergraphAst = await this.schemaVersionHelper.getSupergraphAst(version);
      if (!supergraphAst) {
        this.logger.debug('No supergraph for the latest valid version (versionId=%s)', version.id);
        return { kind: 'no-supergraph' };
      }
      ownership = extractSuperGraphInformation(supergraphAst);
      ownershipCache.set(version.id, ownership);
    }

    const { coordinates, unknownSubgraphs } = fieldCoordinatesOwnedBy(
      ownership,
      args.subgraphNames,
    );
    if (unknownSubgraphs.length > 0) {
      return { kind: 'unknown-subgraphs', subgraphNames: unknownSubgraphs };
    }
    if (coordinates.length > MAX_RESOLVED_SUBGRAPH_COORDINATES) {
      return { kind: 'too-many-coordinates', count: coordinates.length };
    }
    return { kind: 'ok', coordinates };
  }
}

/** The user-facing reason a subgraph filter cannot be applied, or null when it can. */
export function describeSubgraphResolutionFailure(
  result: Exclude<SubgraphFieldCoordinates, { kind: 'ok' }>,
): string {
  switch (result.kind) {
    case 'not-federation':
      return 'Subgraph filters are only available on Federation projects.';
    case 'no-supergraph':
      return 'The target has no composable schema version to resolve subgraphs against.';
    case 'unknown-subgraphs':
      return `Unknown subgraph${result.subgraphNames.length === 1 ? '' : 's'}: ${result.subgraphNames.join(', ')}.`;
    case 'too-many-coordinates':
      return `The selected subgraphs own ${result.count} fields, more than the ${MAX_RESOLVED_SUBGRAPH_COORDINATES} a filter can scope. Filter by fields instead.`;
  }
}
