import type { SchemaVersionMapper as SchemaVersion } from '../module.graphql.mappers';
import { isTypeSystemExtensionNode, print } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import { CriticalityLevel } from '@graphql-inspector/core';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { traceFn } from '@hive/service-common';
import type { SchemaChangeType } from '@hive/storage';
import {
  containsSupergraphSpec,
  transformSupergraphToPublicSchema,
} from '@theguild/federation-composition';
import { ProjectType } from '../../../shared/entities';
import { cache } from '../../../shared/helpers';
import { parseGraphQLSource } from '../../../shared/schema';
import { ProjectManager } from '../../project/providers/project-manager';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import { RegistryChecks } from './registry-checks';
import { ensureCompositeSchemas, SchemaHelper } from './schema-helper';
import { SchemaManager } from './schema-manager';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
/**
 * Utilities for working with schema versions.
 * Because we only started introducing persisting changes/sdl/supergraph later on,
 * we sometimes have to compute them on the fly when someone is accessing older schema versions.
 */
export class SchemaVersionHelper {
  constructor(
    private schemaManager: SchemaManager,
    private schemaHelper: SchemaHelper,
    private projectManager: ProjectManager,
    private registryChecks: RegistryChecks,
    private storage: Storage,
    private logger: Logger,
  ) {}

  @traceFn('SchemaVersionHelper.composeSchemaVersion', {
    initAttributes: input => ({
      'hive.target.id': input.targetId,
      'hive.organization.id': input.organizationId,
      'hive.project.id': input.projectId,
      'hive.version.id': input.id,
    }),
  })
  @cache<SchemaVersion>(version => version.id)
  private async composeSchemaVersion(schemaVersion: SchemaVersion) {
    const [schemas, project, organization] = await Promise.all([
      this.storage.getSchemasOfVersion({
        versionId: schemaVersion.id,
      }),
      this.projectManager.getProject({
        organizationId: schemaVersion.organizationId,
        projectId: schemaVersion.projectId,
      }),
      this.storage.getOrganization({
        organizationId: schemaVersion.organizationId,
      }),
    ]);

    if (schemas.length === 0) {
      return null;
    }

    const orchestrator = this.schemaManager.matchOrchestrator(project.type);
    const validation = await orchestrator.composeAndValidate(
      schemas.map(s => this.schemaHelper.createSchemaObject(s)),
      {
        external: project.externalComposition,
        native: this.schemaManager.checkProjectNativeFederationSupport({
          project,
          organization,
          targetId: schemaVersion.targetId,
        }),
        contracts: null,
      },
    );

    return validation;
  }

  async getSchemaCompositionErrors(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.schemaCompositionErrors;
    }

    const composition = await this.composeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.errors?.length ? composition.errors : null;
  }

  async getCompositeSchemaSdl(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.compositeSchemaSDL
        ? this.autoFixCompositeSchemaSdl(schemaVersion.compositeSchemaSDL, schemaVersion.id)
        : null;
    }

    const composition = await this.composeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.sdl ?? null;
  }

  async getSupergraphSdl(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.supergraphSDL;
    }

    const composition = await this.composeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.supergraph ?? null;
  }

  @cache<SchemaVersion>(version => version.id)
  async getCompositeSchemaAst(schemaVersion: SchemaVersion) {
    const compositeSchemaSdl = await this.getCompositeSchemaSdl(schemaVersion);
    if (compositeSchemaSdl === null) {
      return null;
    }

    const compositeSchemaAst = parseGraphQLSource(
      compositeSchemaSdl,
      'SchemaVersionHelper.getCompositeSchemaAst: Composite',
    );

    return compositeSchemaAst;
  }

  @cache<SchemaVersion>(version => version.id)
  async getSupergraphAst(schemaVersion: SchemaVersion) {
    const compositeSchemaSdl = await this.getSupergraphSdl(schemaVersion);
    if (compositeSchemaSdl === null) {
      return null;
    }

    const supergraphAst = parseGraphQLSource(
      compositeSchemaSdl,
      'SchemaVersionHelper.getSupergraphAst: Supergraph',
    );

    return supergraphAst;
  }

  @traceFn('SchemaVersionHelper.getSchemaChanges', {
    initAttributes: input => ({
      'hive.target.id': input.targetId,
      'hive.organization.id': input.organizationId,
      'hive.project.id': input.projectId,
      'hive.version.id': input.id,
    }),
    resultAttributes: changes => ({
      'hive.breaking-changes.count': changes?.breaking?.length,
      'hive.safe-changes.count': changes?.safe?.length,
    }),
  })
  @cache<SchemaVersion>(version => version.id)
  private async getSchemaChanges(schemaVersion: SchemaVersion) {
    if (!schemaVersion.isComposable) {
      return null;
    }

    if (schemaVersion.hasPersistedSchemaChanges) {
      const changes = await this.storage.getSchemaChangesForVersion({
        versionId: schemaVersion.id,
      });

      const safeChanges: Array<SchemaChangeType> = [];
      const breakingChanges: Array<SchemaChangeType> = [];

      for (const change of changes ?? []) {
        if (change.criticality === CriticalityLevel.Breaking) {
          breakingChanges.push(change);
          continue;
        }
        safeChanges.push(change);
      }

      return {
        breaking: breakingChanges.length ? breakingChanges : null,
        safe: safeChanges.length ? safeChanges : null,
      };
    }

    const previousVersion = await this.getPreviousDiffableSchemaVersion(schemaVersion);

    if (!previousVersion) {
      return null;
    }

    const existingSdl = await this.getCompositeSchemaSdl(previousVersion);
    const incomingSdl = await this.getCompositeSchemaSdl(schemaVersion);

    const [schemaBefore, schemasAfter] = await Promise.all([
      this.storage.getSchemasOfVersion({
        versionId: schemaVersion.id,
      }),
      this.storage.getSchemasOfVersion({
        versionId: previousVersion.id,
      }),
    ]);

    if (!existingSdl || !incomingSdl) {
      return null;
    }

    const project = await this.projectManager.getProject({
      organizationId: schemaVersion.organizationId,
      projectId: schemaVersion.projectId,
    });

    const diffCheck = await this.registryChecks.diff({
      approvedChanges: null,
      existingSdl,
      incomingSdl,
      includeUrlChanges: {
        schemasBefore: ensureCompositeSchemas(schemaBefore),
        schemasAfter: ensureCompositeSchemas(schemasAfter),
      },
      filterOutFederationChanges: project.type === ProjectType.FEDERATION,
      conditionalBreakingChangeConfig: null,
    });

    if (diffCheck.status === 'skipped') {
      return null;
    }

    return diffCheck.reason ?? diffCheck.result;
  }

  async getPreviousDiffableSchemaVersion(
    schemaVersion: SchemaVersion,
  ): Promise<SchemaVersion | null> {
    if (schemaVersion.recordVersion === '2024-01-10') {
      if (schemaVersion.diffSchemaVersionId) {
        return await this.schemaManager.getSchemaVersion({
          organizationId: schemaVersion.organizationId,
          projectId: schemaVersion.projectId,
          targetId: schemaVersion.targetId,
          versionId: schemaVersion.diffSchemaVersionId,
        });
      }
      return null;
    }

    return await this.schemaManager.getVersionBeforeVersionId({
      organization: schemaVersion.organizationId,
      project: schemaVersion.projectId,
      target: schemaVersion.targetId,
      beforeVersionId: schemaVersion.id,
      beforeVersionCreatedAt: schemaVersion.createdAt,
    });
  }

  async getBreakingSchemaChanges(schemaVersion: SchemaVersion) {
    const changes = await this.getSchemaChanges(schemaVersion);
    return changes?.breaking ?? null;
  }

  async getSafeSchemaChanges(schemaVersion: SchemaVersion) {
    const changes = await this.getSchemaChanges(schemaVersion);
    return changes?.safe ?? null;
  }

  async getHasSchemaChanges(schemaVersion: SchemaVersion) {
    const changes = await this.getSchemaChanges(schemaVersion);
    return !!changes?.breaking?.length || !!changes?.safe?.length;
  }

  async getIsFirstComposableVersion(schemaVersion: SchemaVersion) {
    if (!schemaVersion.isComposable) {
      return false;
    }

    if (schemaVersion.recordVersion === '2024-01-10') {
      return schemaVersion.diffSchemaVersionId === null;
    }

    if (schemaVersion.hasPersistedSchemaChanges) {
      const previousVersion = await this.getPreviousDiffableSchemaVersion(schemaVersion);
      if (previousVersion === null) {
        return true;
      }
    }

    const composableVersion =
      await this.schemaManager.getFirstComposableSchemaVersionBeforeVersionId({
        organization: schemaVersion.organizationId,
        project: schemaVersion.projectId,
        target: schemaVersion.targetId,
        beforeVersionId: schemaVersion.id,
        beforeVersionCreatedAt: schemaVersion.createdAt,
      });

    return !composableVersion;
  }

  @traceFn('SchemaVersionHelper.getServiceSdlForPreviousVersionService', {
    initAttributes: (schemaVersion, serviceName) => ({
      'hive.organization.id': schemaVersion.organizationId,
      'hive.project.id': schemaVersion.projectId,
      'hive.target.id': schemaVersion.targetId,
      'hive.version.id': schemaVersion.id,
      'hive.service.name': serviceName,
    }),
  })
  async getServiceSdlForPreviousVersionService(schemaVersion: SchemaVersion, serviceName: string) {
    const previousVersion = await this.getPreviousDiffableSchemaVersion(schemaVersion);
    if (!previousVersion) {
      return null;
    }

    const schemaLog = await this.storage.getServiceSchemaOfVersion({
      schemaVersionId: previousVersion.id,
      serviceName,
    });

    return schemaLog?.sdl ?? null;
  }

  getIsValid(schemaVersion: SchemaVersion) {
    return schemaVersion.isComposable && schemaVersion.hasContractCompositionErrors === false;
  }

  /**
   * There's a possibility that the composite schema SDL contains parts of the supergraph spec.
   *
   *
   * This is a problem because we want to show the public schema to the user, and the supergraph spec is not part of that.
   * This may happen when composite schema was produced with an old version of `transformSupergraphToPublicSchema`
   * or when supergraph sdl contained something new.
   *
   * This function will check if the SDL contains supergraph spec and if it does, it will transform it to public schema.
   *
   * ---
   *
   * There's also a possibility that the composite schema contains type extensions.
   * This is a problem, because other parts of the system may expect it to be clean from type extensions.
   *
   * This function will check for type system extensions and merge them into matching definitions.
   */
  private autoFixCompositeSchemaSdl(sdl: string, versionId: string): string {
    const isFederationV1Output = sdl.includes('@core');
    // Poor's man check for type extensions to avoid parsing the SDL if it's not necessary.
    // Adds a space to the beginning of the SDL to detect type extensions at the beginning of the SDL.
    const hasPotentiallyTypeExtensions = (' ' + sdl).includes(' extend ');

    /**
     * If the SDL is clean from Supergraph spec or it's an output of @apollo/federation, we don't need to transform it.
     * We ignore @apollo/federation, because we never really transformed the output of it to public schema.
     * Doing so might be a breaking change for some users (like: removed join__Graph type).
     */
    if (!isFederationV1Output && containsSupergraphSpec(sdl)) {
      this.logger.warn(
        'Composite schema SDL contains supergraph spec, transforming to public schema (versionId: %s)',
        versionId,
      );

      const transformedSdl = print(
        transformSupergraphToPublicSchema(parseGraphQLSource(sdl, 'autoFixCompositeSchemaSdl')),
      );

      this.logger.debug(
        transformedSdl === sdl
          ? 'Transformation did not change the original SDL'
          : 'Transformation changed the original SDL',
      );

      return transformedSdl;
    }

    /**
     * If the SDL has type extensions, we need to merge them into matching definitions.
     */
    if (hasPotentiallyTypeExtensions) {
      const schemaAst = parseGraphQLSource(sdl, 'autoFixCompositeSchemaSdl');
      const hasTypeExtensions = schemaAst.definitions.some(isTypeSystemExtensionNode);

      if (!hasTypeExtensions) {
        return sdl;
      }

      this.logger.warn(
        'Composite schema AST contains type extensions, merging them into matching definitions',
      );
      return print(mergeTypeDefs(schemaAst));
    }

    return sdl;
  }
}
