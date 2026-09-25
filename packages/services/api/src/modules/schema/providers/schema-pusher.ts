import { createHash } from 'node:crypto';
import { parse } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { trace, traceFn } from '@hive/service-common';
import type { SchemaPushInput } from '../../../__generated__/types';
import { ProjectType } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { Session } from '../../auth/lib/authz';
import { ProjectStore } from '../../project/providers/project-store';
import { IdTranslator } from '../../shared/providers/id-translator';
import {
  registryOperationOutcomeCount,
  registryOperationUnexpectedErrorCount,
  unexpectedErrorMetricLabels,
} from '../../shared/providers/registry-operation-metrics';
import { Storage } from '../../shared/providers/storage';
import { TargetStore } from '../../target/providers/target-store';
import { ensureCompositeSchemas, serviceExists } from './schema-helper';
import { SchemaManager } from './schema-manager';
import { isValidServiceName } from './schema-publisher';
import { SchemaRevisionStore } from './schema-revision-store';

// 1 month
const REVISION_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export const SchemaRevisionNameModel = z
  .string()
  .trim()
  .min(1, 'Revision must be at least 1 character long.')
  .max(64, 'Revision must be at most 64 characters long.')
  .regex(/^[a-zA-Z0-9._-]+$/, "Revision can only contain letters, numbers, '.', '_', and '-'.");

@Injectable({ scope: Scope.Operation })
export class SchemaPusher {
  constructor(
    private session: Session,
    private idTranslator: IdTranslator,
    private storage: Storage,
    private projectStore: ProjectStore,
    private targetStore: TargetStore,
    private schemaManager: SchemaManager,
    private revisions: SchemaRevisionStore,
  ) {}

  @traceFn('SchemaPusher.push', {
    initAttributes: input => ({
      'hive.organization.slug': input.target.bySelector?.organizationSlug,
      'hive.project.slug': input.target.bySelector?.projectSlug,
      'hive.target.slug': input.target.bySelector?.targetSlug,
      'hive.target.id': input.target.byId ?? undefined,
    }),
    resultAttributes: result => ({
      'hive.push.result': result.ok ? 'success' : 'error',
    }),
  })
  async push(input: SchemaPushInput) {
    return this.internalPush(input).then(
      result => {
        registryOperationOutcomeCount.inc({ operation: 'push', conclusion: 'success' });
        return result;
      },
      error => {
        if (error instanceof HiveError) {
          registryOperationOutcomeCount.inc({ operation: 'push', conclusion: 'success' });
        } else {
          registryOperationOutcomeCount.inc({ operation: 'push', conclusion: 'failure' });
          registryOperationUnexpectedErrorCount.inc(unexpectedErrorMetricLabels('push', error));
        }
        throw error;
      },
    );
  }

  private async internalPush(input: SchemaPushInput) {
    const selector = await this.idTranslator.resolveTargetReference({ reference: input.target });
    if (!selector) {
      return this.session.raise('schema:push');
    }

    trace.getActiveSpan()?.setAttributes({
      'hive.organization.id': selector.organizationId,
      'hive.project.id': selector.projectId,
      'hive.target.id': selector.targetId,
    });

    const service = input.service?.toLowerCase() ?? null;
    await this.session.assertPerformAction({
      action: 'schema:push',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        serviceName: service,
      },
    });

    const project = await this.projectStore.getProject({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
    });

    // Like schema publishing, single-schema projects do not use a service name.
    const revisionService = project.type === ProjectType.SINGLE ? null : service;

    if (project.type !== ProjectType.SINGLE) {
      if (!service) {
        return { error: { message: 'Missing service name' } };
      }

      // Like schema check and publish, only new services must follow the naming rules.
      if (!isValidServiceName(service) && !(await this.isExistingService(selector, service))) {
        return {
          error: {
            message:
              'Invalid service name. Service name must be 64 characters or less, must start with a letter, and can only contain alphanumeric characters, dash (-), or underscore (_).',
          },
          ok: null,
        };
      }
    }

    const revision = SchemaRevisionNameModel.safeParse(input.revision);
    if (!revision.success) {
      return { error: { message: revision.error.issues[0]?.message ?? 'Invalid revision.' } };
    }

    let digest: string;
    try {
      parse(input.sdl, { noLocation: true });
      digest = `hive-sdl-v1:sha256:${createHash('sha256').update(input.sdl, 'utf8').digest('hex')}`;
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Invalid schema SDL.' } };
    }

    return await this.revisions.push({
      projectId: selector.projectId,
      service: revisionService,
      revision: revision.data,
      digest,
      sdl: input.sdl,
      expiresAt: new Date(Date.now() + REVISION_RETENTION_MS),
    });
  }

  private async isExistingService(
    selector: { organizationId: string; projectId: string; targetId: string },
    service: string,
  ) {
    const target = await this.targetStore.getTarget(selector);
    const latestVersion = await this.schemaManager.getLatestSchemaVersionWithSchemaLogs({ target });
    return !!latestVersion && serviceExists(ensureCompositeSchemas(latestVersion.schemas), service);
  }
}
