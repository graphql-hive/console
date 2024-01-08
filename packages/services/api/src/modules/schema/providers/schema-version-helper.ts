import { Injectable, Scope } from 'graphql-modules';
import { DocumentNode } from 'graphql/language/ast';
import { type ComposeAndValidateResult } from '../../../shared/entities';
import { SchemaVersion } from '../../../shared/mappers';
import { parseGraphQLSource } from '../../../shared/schema';
import { OrganizationManager } from '../../organization/providers/organization-manager';
import { ProjectManager } from '../../project/providers/project-manager';
import { SchemaHelper } from './schema-helper';
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
  compositionCache = new Map<string, Promise<null | ComposeAndValidateResult>>();
  compositeSchemaAstCache = new Map<string, null | DocumentNode>();
  supergraphAstCache = new Map<string, null | DocumentNode>();

  constructor(
    private schemaManager: SchemaManager,
    private schemaHelper: SchemaHelper,
    private projectManager: ProjectManager,
    private organizationManager: OrganizationManager,
  ) {}

  private async composeSchemaVersion(schemaVersion: SchemaVersion) {
    const [schemas, project, organization] = await Promise.all([
      this.schemaManager.getMaybeSchemasOfVersion({
        version: schemaVersion.id,
        organization: schemaVersion.organization,
        project: schemaVersion.project,
        target: schemaVersion.target,
      }),
      this.projectManager.getProject({
        organization: schemaVersion.organization,
        project: schemaVersion.project,
      }),
      this.organizationManager.getOrganization({
        organization: schemaVersion.organization,
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
        }),
      },
    );

    return validation;
  }

  private getOrComposeSchemaVersion(schemaVersion: SchemaVersion) {
    let promise = this.compositionCache.get(schemaVersion.id)!;
    if (!promise) {
      promise = this.composeSchemaVersion(schemaVersion);
      this.compositionCache.set(schemaVersion.id, promise);
    }

    return promise;
  }

  async getSchemaCompositionErrors(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.schemaCompositionErrors;
    }

    const composition = await this.getOrComposeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.errors?.length ? composition.errors : null;
  }

  async getCompositeSchemaSdl(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.compositeSchemaSDL;
    }

    const composition = await this.getOrComposeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.sdl ?? null;
  }

  async getSupergraphSdl(schemaVersion: SchemaVersion) {
    if (schemaVersion.hasPersistedSchemaChanges) {
      return schemaVersion.supergraphSDL;
    }

    const composition = await this.getOrComposeSchemaVersion(schemaVersion);
    if (composition === null) {
      return null;
    }

    return composition.supergraph ?? null;
  }

  async getCompositeSchemaAst(schemaVersion: SchemaVersion) {
    const compositeSchemaSdl = await this.getCompositeSchemaSdl(schemaVersion);
    if (compositeSchemaSdl === null) {
      return null;
    }

    let compositeSchemaAst = this.compositeSchemaAstCache.get(schemaVersion.id);
    if (compositeSchemaAst === undefined) {
      compositeSchemaAst = parseGraphQLSource(
        compositeSchemaSdl,
        'parse composite schema sdl in SchemaVersionHelper.getCompositeSchemaAst',
      );
      this.compositeSchemaAstCache.set(schemaVersion.id, compositeSchemaAst);
    }

    return compositeSchemaAst;
  }

  async getSupergraphAst(schemaVersion: SchemaVersion) {
    const compositeSchemaSdl = await this.getSupergraphSdl(schemaVersion);
    if (compositeSchemaSdl === null) {
      return null;
    }

    let compositeSchemaAst = this.supergraphAstCache.get(schemaVersion.id);
    if (compositeSchemaAst === undefined) {
      compositeSchemaAst = parseGraphQLSource(
        compositeSchemaSdl,
        'parse supergraph sdl in SchemaVersionHelper.getSupergraphAst',
      );
      this.supergraphAstCache.set(schemaVersion.id, compositeSchemaAst);
    }

    return compositeSchemaAst;
  }
}
