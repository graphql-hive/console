import { CONTEXT, Inject, Injectable, Scope } from 'graphql-modules';
import type { ContractsInputType, SchemaBuilderApi } from '@hive/schema';
import { traceFn } from '@hive/service-common';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { Orchestrator, Project, ProjectType, SchemaObject } from '../../../../shared/entities';
import { Logger } from '../../../shared/providers/logger';
import type { SchemaServiceConfig } from './tokens';
import { SCHEMA_SERVICE_CONFIG } from './tokens';

type ExternalCompositionConfig = {
  endpoint: string;
  encryptedSecret: string;
} | null;

@Injectable({
  scope: Scope.Operation,
})
export class FederationOrchestrator implements Orchestrator {
  type = ProjectType.FEDERATION;
  private logger: Logger;
  private schemaService;

  constructor(
    logger: Logger,
    @Inject(SCHEMA_SERVICE_CONFIG) serviceConfig: SchemaServiceConfig,
    @Inject(CONTEXT) context: GraphQLModules.ModuleContext,
  ) {
    this.logger = logger.child({ service: 'FederationOrchestrator' });
    this.schemaService = createTRPCProxyClient<SchemaBuilderApi>({
      links: [
        httpLink({
          url: `${serviceConfig.endpoint}/trpc`,
          fetch,
          headers: {
            'x-request-id': context.requestId,
          },
        }),
      ],
    });
  }

  private createConfig(config: Project['externalComposition']): ExternalCompositionConfig {
    if (config && config.enabled) {
      if (!config.endpoint) {
        throw new Error('External composition error: endpoint is missing');
      }

      if (!config.encryptedSecret) {
        throw new Error('External composition error: encryptedSecret is missing');
      }

      return {
        endpoint: config.endpoint,
        encryptedSecret: config.encryptedSecret,
      };
    }

    return null;
  }

  @traceFn('FederationOrchestrator.composeAndValidate', {
    initAttributes: (schemas, config) => ({
      'hive.composition.schema.count': schemas.length,
      'hive.composition.external': config.external.enabled,
      'hive.composition.native': config.native,
    }),
    resultAttributes: result => ({
      'hive.composition.error.count': result.errors.length,
      'hive.composition.tags.count': result.tags?.length ?? 0,
      'hive.composition.contracts.count': result.contracts?.length ?? 0,
    }),
  })
  async composeAndValidate(
    schemas: SchemaObject[],
    config: {
      external: Project['externalComposition'];
      native: boolean;
      contracts: ContractsInputType | null;
    },
  ) {
    this.logger.debug(
      'Composing and Validating Federated Schemas (method=%s)',
      config.native ? 'native' : config.external.enabled ? 'external' : 'v1',
    );
    const result = await this.schemaService.composeAndValidate.mutate({
      type: 'federation',
      schemas: schemas.map(s => ({
        raw: s.raw,
        source: s.source,
        url: s.url ?? null,
      })),
      external: this.createConfig(config.external),
      native: config.native,
      contracts: config.contracts,
    });

    return result;
  }
}
