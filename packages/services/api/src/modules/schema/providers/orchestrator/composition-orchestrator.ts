import { CONTEXT, Inject, Injectable, Scope } from 'graphql-modules';
import { abortSignalAny } from '@graphql-hive/signal';
import type { ContractsInputType, SchemaBuilderApi } from '@hive/schema';
import { traceFn } from '@hive/service-common';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import {
  ComposeAndValidateResult,
  Project,
  ProjectType,
  SchemaObject,
} from '../../../../shared/entities';
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
/**
 * Orchestrate composition calls to the schema service.
 */
export class CompositionOrchestrator {
  private logger: Logger;
  private schemaService;
  private incomingRequestAbortSignal: AbortSignal;

  static projectTypeToOrchestratorType(
    projectType: ProjectType,
  ): 'federation' | 'stitching' | 'single' {
    switch (projectType) {
      case ProjectType.FEDERATION:
        return 'federation';
      case ProjectType.STITCHING:
        return 'stitching';
      case ProjectType.SINGLE:
        return 'single';
    }
  }

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
    this.incomingRequestAbortSignal = context.request.signal;
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

  @traceFn('CompositionOrchestrator.composeAndValidate', {
    initAttributes: (ttype, schemas, config) => ({
      'hive.composition.type': ttype,
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
  /**
   * Compose and validate schemas via the schema service.
   * - Requests time out after 30 seconds and result in a human readable error response
   * - In case the incoming request is canceled, the call to the schema service is aborted
   */
  async composeAndValidate(
    compositionType: 'federation' | 'single' | 'stitching',
    schemas: SchemaObject[],
    config: {
      /** Whether external composition should be used (only Federation) */
      external: Project['externalComposition'];
      /** Whether native composition should be used (only Federation) */
      native: boolean;
      /** Specified contracts (only Federation) */
      contracts: ContractsInputType | null;
    },
  ) {
    this.logger.debug(
      'Composing and validating schemas (type=%s, method=%s)',
      compositionType,
      compositionType === 'federation'
        ? config.native
          ? 'native'
          : config.external.enabled
            ? 'external'
            : 'v1'
        : 'none',
    );

    const timeoutAbortSignal = AbortSignal.timeout(30_000);

    const onTimeout = () => {
      this.logger.debug('Composition HTTP request aborted due to timeout of 30 seconds.');
    };
    timeoutAbortSignal.addEventListener('abort', onTimeout);

    const onIncomingRequestAbort = () => {
      this.logger.debug('Composition HTTP request aborted due to incoming request being canceled.');
    };
    this.incomingRequestAbortSignal.addEventListener('abort', onIncomingRequestAbort);

    try {
      const result = await this.schemaService.composeAndValidate.mutate(
        {
          type: compositionType,
          schemas: schemas.map(s => ({
            raw: s.raw,
            source: s.source,
            url: s.url ?? null,
          })),
          external: this.createConfig(config.external),
          native: config.native,
          contracts: config.contracts,
        },
        {
          // We want to abort composition if the request that does the composition is aborted
          // We also limit the maximum time allowed for composition requests to 30 seconds to avoid
          //
          // The reason for these is a potential dead-lock.
          //
          // Note: We are using `abortSignalAny` over `AbortSignal.any` because of leak issues.
          // @source https://github.com/nodejs/node/issues/57584
          signal: abortSignalAny([this.incomingRequestAbortSignal, timeoutAbortSignal]),
        },
      );
      return result;
    } catch (err) {
      // In case of a timeout error we return something the user can process
      if (timeoutAbortSignal.reason) {
        return {
          contracts: null,
          metadataAttributes: null,
          schemaMetadata: null,
          sdl: null,
          supergraph: null,
          tags: null,
          includesNetworkError: true,
          includesException: false,
          errors: [
            {
              message: 'The schema composition timed out. Please try again.',
              source: 'composition',
            },
          ],
        } satisfies ComposeAndValidateResult;
      }

      throw err;
    } finally {
      timeoutAbortSignal.removeEventListener('abort', onTimeout);
      this.incomingRequestAbortSignal.removeEventListener('abort', onIncomingRequestAbort);
    }
  }
}
