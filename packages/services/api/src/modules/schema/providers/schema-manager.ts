import type { SchemaVersionMapper as SchemaVersion } from '../module.graphql.mappers';
import { parse, print } from 'graphql';
import { Inject, Injectable, Scope } from 'graphql-modules';
import lodash from 'lodash';
import { z } from 'zod';
import { traceFn } from '@hive/service-common';
import type {
  ConditionalBreakingChangeMetadata,
  SchemaChangeType,
  SchemaCheck,
  SchemaCompositionError,
} from '@hive/storage';
import { sortSDL } from '@theguild/federation-composition';
import { SchemaChecksFilter } from '../../../__generated__/types';
import {
  DateRange,
  NativeFederationCompatibilityStatus,
  Orchestrator,
  Organization,
  Project,
  ProjectType,
  Target,
} from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { atomic, cache, stringifySelector } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { parseGraphQLSource } from '../../../shared/schema';
import { Session } from '../../auth/lib/authz';
import { GitHubIntegrationManager } from '../../integrations/providers/github-integration-manager';
import { ProjectManager } from '../../project/providers/project-manager';
import { CryptoProvider } from '../../shared/providers/crypto';
import { Logger } from '../../shared/providers/logger';
import {
  OrganizationSelector,
  ProjectSelector,
  Storage,
  TargetSelector,
} from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { BreakingSchemaChangeUsageHelper } from './breaking-schema-changes-helper';
import { SCHEMA_MODULE_CONFIG, type SchemaModuleConfig } from './config';
import { Contracts } from './contracts';
import type { SchemaCoordinatesDiffResult } from './inspector';
import { FederationOrchestrator } from './orchestrators/federation';
import { SingleOrchestrator } from './orchestrators/single';
import { StitchingOrchestrator } from './orchestrators/stitching';
import { ensureCompositeSchemas, removeDescriptions, SchemaHelper } from './schema-helper';

const ENABLE_EXTERNAL_COMPOSITION_SCHEMA = z.object({
  endpoint: z.string().url().nonempty(),
  secret: z.string().nonempty(),
});

const externalSchemaCompositionTestSdl = /* GraphQL */ `
  type Query {
    test: String
  }
`;
const externalSchemaCompositionTestDocument = parse(externalSchemaCompositionTestSdl);

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class SchemaManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private session: Session,
    private storage: Storage,
    private projectManager: ProjectManager,
    private singleOrchestrator: SingleOrchestrator,
    private stitchingOrchestrator: StitchingOrchestrator,
    private federationOrchestrator: FederationOrchestrator,
    private crypto: CryptoProvider,
    private githubIntegrationManager: GitHubIntegrationManager,
    private targetManager: TargetManager,
    private schemaHelper: SchemaHelper,
    private contracts: Contracts,
    private breakingSchemaChangeUsageHelper: BreakingSchemaChangeUsageHelper,
    @Inject(SCHEMA_MODULE_CONFIG) private schemaModuleConfig: SchemaModuleConfig,
  ) {
    this.logger = logger.child({ source: 'SchemaManager' });
  }

  async hasSchema(target: Target) {
    this.logger.debug('Checking if schema is available (targetId=%s)', target.id);
    return this.storage.hasSchema({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
    });
  }

  @traceFn('SchemaManager.compose', {
    initAttributes: input => ({
      'hive.target.id': input.targetId,
      'hive.organization.id': input.organizationId,
      'hive.project.id': input.projectId,
      'input.only.composable': input.onlyComposable,
      'input.services.count': input.services.length,
    }),
  })
  async compose(
    input: TargetSelector & {
      onlyComposable: boolean;
      services: ReadonlyArray<{
        sdl: string;
        url?: string | null;
        name: string;
      }>;
    },
  ) {
    this.logger.debug('Composing schemas (input=%o)', lodash.omit(input, 'services'));
    await this.session.canPerformAction({
      action: 'schema:compose',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    const [organization, project, latestSchemas] = await Promise.all([
      this.storage.getOrganization({
        organizationId: input.organizationId,
      }),
      this.storage.getProject({
        organizationId: input.organizationId,
        projectId: input.projectId,
      }),
      this.storage.getLatestSchemas({
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
        onlyComposable: input.onlyComposable,
      }),
    ]);

    if (project.type !== ProjectType.FEDERATION) {
      return {
        kind: 'error' as const,
        message: 'Only Federation projects are supported',
      };
    }

    const orchestrator = this.matchOrchestrator(project.type);

    const existingServices = ensureCompositeSchemas(latestSchemas ? latestSchemas.schemas : []);
    const services = existingServices
      // remove provided services from the list
      .filter(service => !input.services.some(s => s.name === service.service_name))
      .map(service => ({
        service_name: service.service_name,
        sdl: service.sdl,
        service_url: service.service_url,
      }))
      // add provided services to the list
      .concat(
        input.services.map(service => ({
          service_name: service.name,
          sdl: service.sdl,
          service_url: service.url ?? null,
        })),
      )
      .map(service => this.schemaHelper.createSchemaObject(service));

    const compositionResult = await orchestrator.composeAndValidate(services, {
      external: project.externalComposition,
      native: this.checkProjectNativeFederationSupport({
        project,
        organization,
        targetId: input.targetId,
      }),
      contracts: null,
    });

    if (compositionResult.errors.length > 0) {
      return {
        kind: 'success' as const,
        errors: compositionResult.errors,
      };
    }

    if (compositionResult.supergraph) {
      return {
        kind: 'success' as const,
        supergraphSDL: compositionResult.supergraph,
      };
    }

    throw new Error('Composition was successful but is missing a supergraph');
  }

  @traceFn('SchemaManager.getSchemasOfVersion', {
    initAttributes: selector => ({
      'hive.target.id': selector.targetId,
      'hive.organization.id': selector.organizationId,
      'hive.project.id': selector.projectId,
      'hive.version.id': selector.versionId,
    }),
  })
  @atomic(stringifySelector)
  async getSchemasOfVersion(
    selector: {
      versionId: string;
      includeMetadata?: boolean;
    } & TargetSelector,
  ) {
    this.logger.debug('Fetching non-empty list of schemas (selector=%o)', selector);
    const schemas = await this.storage.getSchemasOfVersion(selector);

    if (schemas.length === 0) {
      throw new HiveError('No schemas found for this version.');
    }

    return schemas;
  }

  @traceFn('SchemaManager.getSchemasOfVersion', {
    initAttributes: input => ({
      'hive.target.id': input.targetId,
      'hive.organization.id': input.organizationId,
      'hive.project.id': input.projectId,
      'hive.version.id': input.id,
    }),
  })
  @atomic(stringifySelector)
  async getMaybeSchemasOfVersion(schemaVersion: SchemaVersion) {
    this.logger.debug('Fetching schemas (schemaVersionId=%s)', schemaVersion.id);
    return this.storage.getSchemasOfVersion({ versionId: schemaVersion.id });
  }

  async getMatchingServiceSchemaOfVersions(versions: { before: string | null; after: string }) {
    this.logger.debug('Fetching service schema of versions (selector=%o)', versions);
    return this.storage.getMatchingServiceSchemaOfVersions(versions);
  }

  async getMaybeLatestValidVersion(target: Target) {
    this.logger.debug('Fetching maybe latest valid version (targetId=%o)', target.id);
    const version = await this.storage.getMaybeLatestValidVersion({
      targetId: target.id,
    });

    if (!version) {
      return null;
    }

    return {
      ...version,
      projectId: target.projectId,
      targetId: target.id,
      organizationId: target.orgId,
    };
  }

  async getLatestValidVersion(selector: TargetSelector) {
    this.logger.debug('Fetching latest valid version (selector=%o)', selector);
    return {
      ...(await this.storage.getLatestValidVersion(selector)),
      projectId: selector.projectId,
      targetId: selector.targetId,
      organizationId: selector.organizationId,
    };
  }

  async getMaybeLatestVersion(target: Target) {
    this.logger.debug('Fetching maybe latest version (targetId=%o)', target.id);
    const latest = await this.storage.getMaybeLatestVersion({
      targetId: target.id,
      projectId: target.projectId,
      organizationId: target.orgId,
    });

    if (!latest) {
      return null;
    }

    return {
      ...latest,
      projectId: target.projectId,
      targetId: target.id,
      organizationId: target.orgId,
    };
  }

  async getSchemaVersion(selector: TargetSelector & { versionId: string }) {
    this.logger.debug('Fetching single schema version (selector=%o)', selector);
    const result = await this.storage.getVersion(selector);

    return {
      projectId: selector.projectId,
      targetId: selector.targetId,
      organizationId: selector.organizationId,
      ...result,
    };
  }

  async getPaginatedSchemaVersionsForTargetId(args: {
    targetId: string;
    organizationId: string;
    projectId: string;
    first: number | null;
    cursor: null | string;
  }) {
    const connection = await this.storage.getPaginatedSchemaVersionsForTargetId(args);

    return {
      ...connection,
      edges: connection.edges.map(edge => ({
        ...edge,
        node: {
          ...edge.node,
          organizationId: args.organizationId,
          projectId: args.projectId,
          targetId: args.targetId,
        },
      })),
    };
  }

  async getSchemaLog(selector: { commit: string } & TargetSelector) {
    this.logger.debug('Fetching schema log (selector=%o)', selector);
    return this.storage.getSchemaLog({
      commit: selector.commit,
      targetId: selector.targetId,
    });
  }

  @traceFn('SchemaManager.createVersion', {
    initAttributes: input => ({
      'hive.target.id': input.targetId,
      'hive.organization.id': input.organizationId,
      'hive.project.id': input.projectId,
      'hive.version.commit': input.commit,
      'hive.version.valid': input.valid,
      'hive.version.service': input.service || '',
    }),
  })
  async createVersion(
    input: ({
      commit: string;
      schema: string;
      author: string;
      valid: boolean;
      service?: string | null;
      logIds: string[];
      url?: string | null;
      base_schema: string | null;
      metadata: string | null;
      projectType: ProjectType;
      actionFn(): Promise<void>;
      changes: Array<SchemaChangeType>;
      coordinatesDiff: SchemaCoordinatesDiffResult | null;
      previousSchemaVersion: string | null;
      diffSchemaVersionId: string | null;
      github: null | {
        repository: string;
        sha: string;
      };
      contracts: null | Array<{
        contractId: string;
        contractName: string;
        compositeSchemaSDL: string | null;
        supergraphSDL: string | null;
        schemaCompositionErrors: Array<SchemaCompositionError> | null;
        changes: null | Array<SchemaChangeType>;
      }>;
      conditionalBreakingChangeMetadata: null | ConditionalBreakingChangeMetadata;
    } & TargetSelector) &
      (
        | {
            compositeSchemaSDL: null;
            supergraphSDL: null;
            schemaCompositionErrors: Array<SchemaCompositionError>;
            tags: null;
          }
        | {
            compositeSchemaSDL: string;
            supergraphSDL: string | null;
            schemaCompositionErrors: null;
            tags: Array<string> | null;
          }
      ),
  ) {
    this.logger.info(
      'Creating a new version (input=%o)',
      lodash.pick(input, [
        'commit',
        'author',
        'valid',
        'service',
        'logIds',
        'url',
        'projectType',
        'previousSchemaVersion',
        'diffSchemaVersionId',
        'github',
        'conditionalBreakingChangeMetadata',
      ]),
    );

    return this.storage.createVersion({
      ...input,
      logIds: input.logIds,
    });
  }

  async testExternalSchemaComposition(selector: { projectId: string; organizationId: string }) {
    await this.session.assertPerformAction({
      organizationId: selector.organizationId,
      action: 'project:modifySettings',
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const [project, organization] = await Promise.all([
      this.storage.getProject({
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      }),
      this.storage.getOrganization({
        organizationId: selector.organizationId,
      }),
    ]);

    if (project.type !== ProjectType.FEDERATION) {
      throw new HiveError(
        'Project is not of Federation type. External composition is not available.',
      );
    }

    if (!project.externalComposition.enabled) {
      throw new HiveError('External composition is not enabled.');
    }

    const orchestrator = this.matchOrchestrator(project.type);

    try {
      const { errors } = await orchestrator.composeAndValidate(
        [
          {
            document: externalSchemaCompositionTestDocument,
            raw: externalSchemaCompositionTestSdl,
            source: 'test',
            url: null,
          },
        ],
        {
          external: project.externalComposition,
          native: this.checkProjectNativeFederationSupport({
            project,
            organization,
            targetId: null,
          }),
          contracts: null,
        },
      );

      if (errors.length > 0) {
        return {
          kind: 'error',
          error: errors[0].message,
        } as const;
      }

      return {
        kind: 'success',
        project,
      } as const;
    } catch (error) {
      return {
        kind: 'error',
        error: error instanceof HiveError ? error.message : 'Unknown error',
      } as const;
    }
  }

  matchOrchestrator(projectType: ProjectType): Orchestrator | never {
    switch (projectType) {
      case ProjectType.SINGLE: {
        return this.singleOrchestrator;
      }
      case ProjectType.STITCHING: {
        return this.stitchingOrchestrator;
      }
      case ProjectType.FEDERATION: {
        return this.federationOrchestrator;
      }
      default: {
        throw new HiveError(`Couldn't find an orchestrator for project type "${projectType}"`);
      }
    }
  }

  async getBaseSchemaForTarget(target: Target) {
    this.logger.debug('Fetching base schema (selector=%o)', target);

    return await this.storage.getBaseSchema({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
    });
  }
  async updateBaseSchema(selector: TargetSelector, newBaseSchema: string | null) {
    this.logger.debug('Updating base schema (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });
    await this.storage.updateBaseSchema(selector, newBaseSchema);
  }

  countSchemaVersionsOfProject(
    selector: ProjectSelector & {
      period: DateRange | null;
    },
  ): Promise<number> {
    this.logger.debug('Fetching schema versions count of project (selector=%o)', selector);
    return this.storage.countSchemaVersionsOfProject(selector);
  }

  countSchemaVersionsOfTarget(
    selector: TargetSelector & {
      period: DateRange | null;
    },
  ): Promise<number> {
    this.logger.debug('Fetching schema versions count of target (selector=%o)', selector);
    return this.storage.countSchemaVersionsOfTarget(selector);
  }

  async completeGetStartedCheck(
    selector: OrganizationSelector & {
      step: 'publishingSchema' | 'checkingSchema';
    },
  ) {
    try {
      await this.storage.completeGetStartedStep(selector);
    } catch (error) {
      this.logger.error(
        'Failed to complete get started check (selector=%o, error=%s)',
        selector,
        error,
      );
    }
  }

  async disableExternalSchemaComposition(input: ProjectSelector) {
    this.logger.debug('Disabling external composition (input=%o)', input);
    await this.session.assertPerformAction({
      organizationId: input.organizationId,
      action: 'project:modifySettings',
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
    });

    await this.storage.disableExternalSchemaComposition(input);

    return {
      ok: await this.projectManager.getProject({
        organizationId: input.organizationId,
        projectId: input.projectId,
      }),
    };
  }

  async enableExternalSchemaComposition(
    input: ProjectSelector & {
      endpoint: string;
      secret: string;
    },
  ) {
    this.logger.debug('Enabling external composition (input=%o)', lodash.omit(input, ['secret']));
    await this.session.assertPerformAction({
      organizationId: input.organizationId,
      action: 'project:modifySettings',
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
    });
    const parseResult = ENABLE_EXTERNAL_COMPOSITION_SCHEMA.safeParse({
      endpoint: input.endpoint,
      secret: input.secret,
    });

    if (!parseResult.success) {
      return {
        error: {
          message: parseResult.error.message,
          inputErrors: {
            endpoint: parseResult.error.formErrors.fieldErrors.endpoint?.[0],
            secret: parseResult.error.formErrors.fieldErrors.secret?.[0],
          },
        },
      };
    }

    const encryptedSecret = this.crypto.encrypt(input.secret);

    await this.storage.enableExternalSchemaComposition({
      projectId: input.projectId,
      organizationId: input.organizationId,
      endpoint: input.endpoint.trim(),
      encryptedSecret,
    });

    return {
      ok: await this.projectManager.getProject({
        organizationId: input.organizationId,
        projectId: input.projectId,
      }),
    };
  }

  async updateNativeSchemaComposition(
    input: ProjectSelector & {
      enabled: boolean;
    },
  ) {
    this.logger.debug('Updating native schema composition (input=%o)', input);
    await this.session.assertPerformAction({
      organizationId: input.organizationId,
      action: 'project:modifySettings',
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
    });

    const project = await this.projectManager.getProject({
      organizationId: input.organizationId,
      projectId: input.projectId,
    });

    if (project.type !== ProjectType.FEDERATION) {
      throw new HiveError(`Native schema composition is supported only by Federation projects`);
    }

    return this.storage.updateNativeSchemaComposition({
      projectId: input.projectId,
      organizationId: input.organizationId,
      enabled: input.enabled,
    });
  }

  async getPaginatedSchemaChecksForTarget<TransformedSchemaCheck extends SchemaCheck>(
    target: Target,
    args: {
      first: number | null;
      cursor: string | null;
      transformNode: (check: SchemaCheck) => TransformedSchemaCheck;
      filters: SchemaChecksFilter | null;
    },
  ) {
    const paginatedResult = await this.storage.getPaginatedSchemaChecksForTarget({
      targetId: target.id,
      first: args.first,
      cursor: args.cursor,
      transformNode: node => args.transformNode(node),
      filters: args.filters,
    });

    return paginatedResult;
  }

  async findSchemaCheckForTarget(target: Target, schemaCheckId: string) {
    this.logger.debug(
      'Find schema check (targetId=%s, schemaCheckId=%s)',
      target.id,
      schemaCheckId,
    );

    if (isUUID(schemaCheckId) === false) {
      this.logger.debug(
        'Invalid ID provided (targetId=%s, schemaCheckId=%s)',
        target.id,
        schemaCheckId,
      );

      return null;
    }

    const schemaCheck = await this.storage.findSchemaCheck({
      targetId: target.id,
      schemaCheckId,
    });

    if (schemaCheck == null) {
      this.logger.debug(
        'Schema check not found (targetId=%s, schemaCheckId=%s)',
        target.id,
        schemaCheckId,
      );
      return null;
    }

    if (schemaCheck.breakingSchemaChanges && schemaCheck.conditionalBreakingChangeMetadata) {
      for (const change of schemaCheck.breakingSchemaChanges) {
        this.breakingSchemaChangeUsageHelper.registerUsageDataForBreakingSchemaChange(
          change,
          schemaCheck.conditionalBreakingChangeMetadata.usage,
        );
      }
    }

    return schemaCheck;
  }

  async getSchemaCheckWebUrl(args: {
    schemaCheckId: string;
    targetId: string;
  }): Promise<null | string> {
    if (this.schemaModuleConfig.schemaCheckLink == null) {
      return null;
    }

    const breadcrumb = await this.storage.getTargetBreadcrumbForTargetId({
      targetId: args.targetId,
    });
    if (!breadcrumb) {
      return null;
    }

    return this.schemaModuleConfig.schemaCheckLink({
      organization: {
        slug: breadcrumb.organizationSlug,
      },
      project: {
        slug: breadcrumb.projectSlug,
      },
      target: {
        slug: breadcrumb.targetSlug,
      },
      schemaCheckId: args.schemaCheckId,
    });
  }

  /**
   * Whether a failed schema check can be approved manually.
   */
  @cache<SchemaCheck>(schemaCheck => schemaCheck.id)
  async getFailedSchemaCheckCanBeApproved(schemaCheck: SchemaCheck) {
    this.logger.debug(
      'Check if failed schema check can be approved. (schemaCheckId=%s)',
      schemaCheck.id,
    );

    if (schemaCheck.schemaCompositionErrors !== null) {
      this.logger.debug(
        'Check can not be approved due to composition errors. (schemaCheckId=%s)',
        schemaCheck.id,
      );
      return false;
    }

    this.logger.debug(
      'Check if contracts have composition errors. (schemaCheckId=%s)',
      schemaCheck.id,
    );

    const contracts = await this.contracts.getContractChecksBySchemaCheckId({
      schemaCheckId: schemaCheck.id,
      onlyFailedWithBreakingChanges: false,
    });

    if (contracts === null) {
      this.logger.debug(
        'No contracts found, schema check can be approved. (schemaCheckId=%s)',
        schemaCheck.id,
      );

      return true;
    }

    this.logger.debug(
      '%s contract(s) found, schema check can be approved. (schemaCheckId=%s)',
      schemaCheck.id,
      contracts.length,
    );

    for (const contract of contracts) {
      if (contract.schemaCompositionErrors !== null) {
        this.logger.debug(
          'Contract has composition errors, schema check can not be approved. (schemaCheckId=%s, contractId=%s)',
          schemaCheck.id,
          contract.contractId,
        );
        return false;
      }
    }

    return true;
  }

  async getFailedSchemaCheckCanBeApprovedByViewer(
    schemaCheck: SchemaCheck & {
      selector: {
        organizationId: string;
        projectId: string;
      };
    },
  ) {
    if (!this.session.getViewer()) {
      // TODO: support approving a schema check via non web app user?
      return false;
    }

    const isViewer = this.session.isViewer();

    if (!isViewer) {
      return false;
    }

    const isAllowedToApproveFailedSchemaCheck = await this.session.canPerformAction({
      action: 'schemaCheck:approve',
      organizationId: schemaCheck.selector.organizationId,
      params: {
        organizationId: schemaCheck.selector.organizationId,
        projectId: schemaCheck.selector.projectId,
        targetId: schemaCheck.targetId,
        serviceName: schemaCheck.serviceName ?? null,
      },
    });

    if (isAllowedToApproveFailedSchemaCheck === false) {
      return false;
    }

    return await this.getFailedSchemaCheckCanBeApproved(schemaCheck);
  }

  /**
   * Approve a schema check that failed due to breaking changes.
   * You cannot approve a schema check that failed because composition failed.
   */
  async approveFailedSchemaCheck(args: {
    targetId: string;
    projectId: string;
    organizationId: string;
    schemaCheckId: string;
    comment: string | null | undefined;
  }) {
    this.logger.debug('Manually approve failed schema check (args=%o)', args);

    let [schemaCheck, viewer, target] = await Promise.all([
      this.storage.findSchemaCheck({
        targetId: args.targetId,
        schemaCheckId: args.schemaCheckId,
      }),
      this.session.getViewer(),
      this.storage.getTarget({
        organizationId: args.organizationId,
        projectId: args.projectId,
        targetId: args.targetId,
      }),
    ]);

    if (schemaCheck == null || schemaCheck.targetId !== args.targetId) {
      this.logger.debug('Schema check not found (args=%o)', args);
      return {
        type: 'error',
        reason: "Schema check doesn't exist.",
      } as const;
    }

    await this.session.assertPerformAction({
      action: 'schemaCheck:approve',
      organizationId: args.organizationId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
        serviceName: schemaCheck.serviceName ?? null,
      },
    });

    if (schemaCheck.isSuccess) {
      this.logger.debug('Schema check is not failed (args=%o)', args);
      return {
        type: 'error',
        reason: 'Schema check is not failed.',
      } as const;
    }

    if (!(await this.getFailedSchemaCheckCanBeApproved(schemaCheck))) {
      this.logger.debug('Schema check can not be approved. (args=%o)', args);
      return {
        type: 'error',
        reason: 'Schema check has composition errors.',
      } as const;
    }

    if (schemaCheck.githubCheckRunId) {
      this.logger.debug('Attempt updating GitHub schema check. (args=%o).', args);
      const project = await this.projectManager.getProject({
        organizationId: args.organizationId,
        projectId: args.projectId,
      });
      const gitRepository = schemaCheck.githubRepository ?? project.gitRepository;
      if (!gitRepository) {
        this.logger.debug(
          'Skip updating GitHub schema check. Schema check has no git repository or project has no git repository connected. (args=%o).',
          args,
        );
      } else {
        const [owner, repository] = gitRepository.split('/');
        const result = await this.githubIntegrationManager.updateCheckRunToSuccess({
          organizationId: args.organizationId,
          checkRun: {
            owner,
            repository,
            checkRunId: schemaCheck.githubCheckRunId,
          },
        });

        // In case updating the check run fails, we don't want to update our database state.
        // Instead, we want to return the error to the user and inform him that there is an issue with GitHub
        // and he needs to try again later.
        if (result?.type === 'error') {
          return {
            type: 'error',
            reason: result.reason,
          } as const;
        }
      }
    }

    schemaCheck = await this.storage.approveFailedSchemaCheck({
      targetId: target.id,
      contracts: this.contracts,
      schemaCheckId: args.schemaCheckId,
      userId: viewer.id,
      comment: args.comment,
    });

    if (!schemaCheck) {
      return {
        type: 'error',
        reason: "Schema check doesn't exist.",
      } as const;
    }

    return {
      type: 'ok',
      schemaCheck,
    } as const;
  }

  async getApprovedByUser(args: { organizationId: string; userId: string | null }) {
    if (args.userId == null) {
      return null;
    }

    return this.storage.getUserById({
      id: args.userId,
    });
  }

  async getSchemaVersionByActionId(args: { actionId: string }) {
    const selector = this.session.getLegacySelector();

    this.logger.debug('Fetch schema version by action id. (args=%o)', {
      projectId: selector.projectId,
      targetId: selector.targetId,
      actionId: args.actionId,
    });

    await this.session.assertPerformAction({
      action: 'schema:loadFromRegistry',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    const record = await this.storage.getSchemaVersionByActionId({
      projectId: selector.projectId,
      targetId: selector.targetId,
      actionId: args.actionId,
    });

    if (!record) {
      return null;
    }

    return {
      ...record,
      projectId: selector.projectId,
      targetId: selector.targetId,
      organizationId: selector.organizationId,
    };
  }

  async getVersionBeforeVersionId(args: {
    organization: string;
    project: string;
    target: string;
    beforeVersionId: string;
    beforeVersionCreatedAt: string;
  }) {
    this.logger.debug('Fetch version before version id. (args=%o)', args);

    const [organization, project] = await Promise.all([
      this.storage.getOrganization({
        organizationId: args.organization,
      }),
      this.storage.getProject({
        organizationId: args.organization,
        projectId: args.project,
      }),
    ]);

    const schemaVersion = await this.storage.getVersionBeforeVersionId({
      targetId: args.target,
      beforeVersionId: args.beforeVersionId,
      beforeVersionCreatedAt: args.beforeVersionCreatedAt,
      onlyComposable: shouldUseLatestComposableVersion(args.target, project, organization),
    });

    if (!schemaVersion) {
      return null;
    }

    return {
      ...schemaVersion,
      organizationId: args.organization,
      projectId: args.project,
      targetId: args.target,
    };
  }

  async getFirstComposableSchemaVersionBeforeVersionId(args: {
    organization: string;
    project: string;
    target: string;
    beforeVersionId: string;
    beforeVersionCreatedAt: string;
  }) {
    const schemaVersion = await this.storage.getVersionBeforeVersionId({
      targetId: args.target,
      beforeVersionId: args.beforeVersionId,
      beforeVersionCreatedAt: args.beforeVersionCreatedAt,
      onlyComposable: true,
    });

    if (!schemaVersion) {
      return null;
    }

    return {
      ...schemaVersion,
      organizationId: args.organization,
      projectId: args.project,
      targetId: args.target,
    };
  }

  checkProjectNativeFederationSupport(input: {
    targetId: string | null;
    project: Pick<Project, 'id' | 'nativeFederation'>;
    organization: Pick<Organization, 'id' | 'featureFlags'>;
  }) {
    if (input.project.nativeFederation === false) {
      return false;
    }

    if (
      input.targetId &&
      input.organization.featureFlags.forceLegacyCompositionInTargets.includes(input.targetId)
    ) {
      this.logger.warn(
        'Native Federation support is disabled for this target (organization=%s, project=%s, target=%s)',
        input.organization.id,
        input.project.id,
        input.targetId,
      );
      return false;
    }

    this.logger.debug(
      'Native Federation support available (organization=%s, project=%s)',
      input.organization.id,
      input.project.id,
    );
    return true;
  }

  async getNativeFederationCompatibilityStatus(project: Project) {
    this.logger.debug(
      'Get native Federation compatibility status (organization=%s, project=%s)',
      project.orgId,
      project.id,
    );

    if (project.type !== ProjectType.FEDERATION) {
      return NativeFederationCompatibilityStatus.NOT_APPLICABLE;
    }

    const targets = await this.targetManager.getTargets({
      organizationId: project.orgId,
      projectId: project.id,
    });

    const possibleVersions = await Promise.all(
      targets.map(target => this.getMaybeLatestValidVersion(target)),
    );

    const versions = possibleVersions.filter((v): v is SchemaVersion => !!v);

    this.logger.debug('Found %s targets and %s versions', targets.length, versions.length);

    // If there are no composable versions available, we can't determine the compatibility status.
    if (
      versions.length === 0 ||
      !versions.every(
        version => version && version.isComposable && typeof version.supergraphSDL === 'string',
      )
    ) {
      this.logger.debug('No composable versions available (status: unknown)');
      return NativeFederationCompatibilityStatus.UNKNOWN;
    }

    const schemasPerVersion = await Promise.all(
      versions.map(async version =>
        this.getSchemasOfVersion({
          organizationId: version.organizationId,
          projectId: version.projectId,
          targetId: version.targetId,
          versionId: version.id,
        }),
      ),
    );

    const orchestrator = this.matchOrchestrator(ProjectType.FEDERATION);

    this.logger.debug('Checking compatibility of %s versions', versions.length);

    const compatibilityResults = await Promise.all(
      versions.map(async (version, i) => {
        if (schemasPerVersion[i].length === 0) {
          this.logger.debug('No schemas (version=%s)', version.id);
          return NativeFederationCompatibilityStatus.UNKNOWN;
        }

        const compositionResult = await orchestrator.composeAndValidate(
          ensureCompositeSchemas(schemasPerVersion[i]).map(s =>
            this.schemaHelper.createSchemaObject({
              sdl: s.sdl,
              service_name: s.service_name,
              service_url: s.service_url,
            }),
          ),
          {
            native: true,
            external: {
              enabled: false,
            },
            contracts: null,
          },
        );

        if (compositionResult.supergraph) {
          const sortedExistingSupergraph = print(
            removeDescriptions(
              sortSDL(
                parseGraphQLSource(
                  compositionResult.supergraph,
                  'parsing existing supergraph in getNativeFederationCompatibilityStatus',
                ),
              ),
            ),
          );
          const sortedNativeSupergraph = print(
            removeDescriptions(
              sortSDL(
                parseGraphQLSource(
                  version.supergraphSDL!,
                  'parsing native supergraph in getNativeFederationCompatibilityStatus',
                ),
              ),
            ),
          );

          if (sortedNativeSupergraph === sortedExistingSupergraph) {
            return NativeFederationCompatibilityStatus.COMPATIBLE;
          }

          this.logger.debug('Produced different supergraph (version=%s)', version.id);
        } else {
          this.logger.debug('Failed to produce supergraph (version=%s)', version.id);
        }

        return NativeFederationCompatibilityStatus.INCOMPATIBLE;
      }),
    );

    if (compatibilityResults.includes(NativeFederationCompatibilityStatus.UNKNOWN)) {
      this.logger.debug('One of the versions seems empty (status: unknown)');
      return NativeFederationCompatibilityStatus.UNKNOWN;
    }

    if (compatibilityResults.every(r => r === NativeFederationCompatibilityStatus.COMPATIBLE)) {
      this.logger.debug('All versions are compatible (status: compatible)');
      return NativeFederationCompatibilityStatus.COMPATIBLE;
    }

    this.logger.debug('Some versions are incompatible (status: incompatible)');
    return NativeFederationCompatibilityStatus.INCOMPATIBLE;
  }

  async getGitHubMetadata(schemaVersion: SchemaVersion): Promise<null | {
    repository: `${string}/${string}`;
    commit: string;
  }> {
    if (schemaVersion.github) {
      return {
        repository: schemaVersion.github.repository as `${string}/${string}`,
        commit: schemaVersion.github.sha,
      };
    }

    const log = await this.getSchemaLog({
      commit: schemaVersion.actionId,
      organizationId: schemaVersion.organizationId,
      projectId: schemaVersion.projectId,
      targetId: schemaVersion.targetId,
    });

    if ('commit' in log && log.commit) {
      const project = await this.storage.getProject({
        organizationId: schemaVersion.organizationId,
        projectId: schemaVersion.projectId,
      });

      if (project.gitRepository) {
        return {
          repository: project.gitRepository,
          commit: log.commit,
        };
      }
    }

    return null;
  }

  async getUserForSchemaChangeById(input: { userId: string }) {
    this.logger.info('Load user by id. (userId=%%)', input.userId);
    const user = await this.storage.getUserById({ id: input.userId });
    if (user) {
      this.logger.info('User found. (userId=%s)', input.userId);
      return user;
    }
    this.logger.info('User not found. (userId=%s)', input.userId);
    return null;
  }
}

export function shouldUseLatestComposableVersion(
  targetId: string,
  project: Project,
  organization: Organization,
) {
  return (
    organization.featureFlags.compareToPreviousComposableVersion ||
    // If the project is a native federation project, we should compare to the latest composable version
    (project.nativeFederation &&
      // but only if the target is not forced to use the legacy composition
      !organization.featureFlags.forceLegacyCompositionInTargets.includes(targetId))
  );
}
