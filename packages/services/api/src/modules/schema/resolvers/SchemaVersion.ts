import type { ExplorerSupergraph, SchemaVersionMapper } from '../module.graphql.mappers';
import type { SchemaExplorerSnapshotReader } from '@hive/schema-explorer-snapshot';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { Logger } from '../../shared/providers/logger';
import { isFieldRequestedDeep } from '../lib/graphql-info-helper';
import { onlyDeprecatedTypes, onlyUnusedTypes } from '../lib/schema-explorer-filters';
import { Contracts } from '../providers/contracts';
import { SchemaManager } from '../providers/schema-manager';
import { SchemaVersionHelper } from '../providers/schema-version-helper';
import type { SchemaVersionResolvers } from './../../../__generated__/types';

export const SchemaVersion: SchemaVersionResolvers = {
  isComposable: version => {
    return version.schemaCompositionErrors === null;
  },
  hasSchemaChanges: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getHasSchemaChanges(version);
  },
  log: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getGraphQLRegistryLogForSchemaVersion(version);
  },
  schemas: (version, _, { injector }, info) => {
    return injector.get(SchemaManager).getMaybeSchemasOfVersion(version, {
      withSDL: isFieldRequestedDeep(info, [
        ['SingleSchema', 'source'],
        ['CompositeSchema', 'source'],
      ]),
    });
  },
  schemaCompositionErrors: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getSchemaCompositionErrors(version);
  },
  breakingSchemaChanges: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getBreakingSchemaChanges(version);
  },
  safeSchemaChanges: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getSafeSchemaChanges(version);
  },
  schemaChanges: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getAllSchemaChanges(version);
  },
  supergraph: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getSupergraphSdl(version);
  },
  sdl: async (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getCompositeSchemaSdl(version);
  },
  baseSchema: async version => {
    return version.baseSchema ?? null;
  },
  explorer: async (version, { usage }, { injector }) => {
    // Checked before the schema work, so a bad period fails once and early.
    const period = await injector
      .get(OperationsManager)
      .usagePeriod({ organizationId: version.organizationId }, usage?.period);
    const snapshot = await injector.get(SchemaVersionHelper).getExplorerSnapshot(version);

    if (!snapshot) {
      return null;
    }

    return {
      snapshot,
      usage: {
        period,
        organizationId: version.organizationId,
        projectId: version.projectId,
        targetId: version.targetId,
      },
      supergraph: explorerSupergraph(version, snapshot),
    };
  },
  unusedSchema: async (version, args, { injector }) => {
    const snapshot = await injector.get(SchemaVersionHelper).getExplorerSnapshot(version);

    if (!snapshot) {
      return null;
    }

    const period = await injector
      .get(OperationsManager)
      .usagePeriod({ organizationId: version.organizationId }, args.period?.absoluteRange);

    const usedCoordinates = await injector.get(OperationsManager).getReportedSchemaCoordinates({
      targetId: version.targetId,
      projectId: version.projectId,
      organizationId: version.organizationId,
      period,
    });

    return {
      types: onlyUnusedTypes(
        snapshot.getTypeEntities(snapshot.getTypesWithUnusedCoordinates(usedCoordinates)),
        usedCoordinates,
      ),
      usage: {
        period,
        organizationId: version.organizationId,
        projectId: version.projectId,
        targetId: version.targetId,
        usedCoordinates,
      },
      supergraph: explorerSupergraph(version, snapshot),
    };
  },
  deprecatedSchema: async (version, args, { injector }) => {
    injector
      .get(Logger)
      .debug(
        'Build deprecated schema explorer. (organizationId=%s, projectId=%s, targetId=%s, schemaVersionId=%s)',
        version.organizationId,
        version.projectId,
        version.targetId,
        version.id,
      );

    const snapshot = await injector.get(SchemaVersionHelper).getExplorerSnapshot(version);

    if (!snapshot) {
      return null;
    }

    const period = await injector
      .get(OperationsManager)
      .usagePeriod({ organizationId: version.organizationId }, args.period?.absoluteRange);

    return {
      types: onlyDeprecatedTypes(snapshot.getTypeEntities(snapshot.deprecatedTypes)),
      usage: {
        period,
        organizationId: version.organizationId,
        projectId: version.projectId,
        targetId: version.targetId,
      },
      supergraph: explorerSupergraph(version, snapshot),
    };
  },
  date: version => version.createdAt,
  githubMetadata: (version, _, { injector }) => {
    return injector.get(SchemaManager).getGitHubMetadata(version);
  },
  valid: (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getIsValid(version);
  },
  isValid: (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getIsValid(version);
  },
  previousDiffableSchemaVersion: (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getPreviousDiffableSchemaVersion(version);
  },
  isFirstComposableVersion: (version, _, { injector }) => {
    return injector.get(SchemaVersionHelper).getIsFirstComposableVersion(version);
  },
  contractVersions: (version, _, { injector }) => {
    return injector
      .get(Contracts)
      .getContractVersionsForSchemaVersion({ schemaVersionId: version.id });
  },
  subgraphDiffs: async (version, _, { injector }) => {
    return await injector.get(SchemaVersionHelper).getGraphQLSubgraphDiffsForSchemaVersion(version);
  },
  origin: async (version, _, { injector }) => {
    return await injector
      .get(SchemaVersionHelper)
      .getGraphQLSchemaVersionOriginForSchemaVersion(version);
  },
  meta: async (version, _, { injector }) => {
    if (version.meta) {
      return version.meta;
    }

    const log = await injector
      .get(SchemaVersionHelper)
      .getGraphQLRegistryLogForSchemaVersion(version);

    return {
      author: log.author ?? null,
      commit: log.commit ?? null,
    };
  },
};

function explorerSupergraph(
  version: SchemaVersionMapper,
  snapshot: SchemaExplorerSnapshotReader,
): ExplorerSupergraph {
  return {
    getOwnedByServices: coordinate => snapshot.getOwnedBy(coordinate),
    getMetadata: coordinate =>
      version.schemaMetadata && Object.hasOwn(version.schemaMetadata, coordinate)
        ? version.schemaMetadata[coordinate]
        : null,
    metadataAttributes: version.metadataAttributes
      ? Object.entries(version.metadataAttributes).map(([name, values]) => ({ name, values }))
      : null,
    subgraphNames: snapshot.subgraphNames,
  };
}
