import { createHash } from 'node:crypto';
import { parse } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import type { SchemaPushInput } from '../../../__generated__/types';
import { ProjectType } from '../../../shared/entities';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Storage } from '../../shared/providers/storage';
import { isValidServiceName } from './schema-publisher';
import { SchemaRevisionStore } from './schema-revision-store';

// 1 month
const REVISION_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export const SchemaRevisionVersionModel = z
  .string()
  .trim()
  .min(1, 'Version must be at least 1 character long.')
  .max(64, 'Version must be at most 64 characters long.')
  .regex(/^[a-zA-Z0-9._-]+$/, "Version can only contain letters, numbers, '.', '_', and '-'.");

@Injectable({ scope: Scope.Operation })
export class SchemaPusher {
  constructor(
    private session: Session,
    private idTranslator: IdTranslator,
    private storage: Storage,
    private revisions: SchemaRevisionStore,
  ) {}

  async push(input: SchemaPushInput) {
    const selector = await this.idTranslator.resolveTargetReference({ reference: input.target });
    if (!selector) {
      return this.session.raise('schema:push');
    }

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

    const project = await this.storage.getProject({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
    });

    if (project.type === ProjectType.SINGLE && service) {
      return { error: { message: 'Service must not be provided for a single-schema project.' } };
    }

    if (project.type !== ProjectType.SINGLE && !service) {
      if (!service) {
        return { error: { message: 'Missing service name' } };
      }

      if (!isValidServiceName(service)) {
        return {
          error: {
            message:
              'Invalid service name. Service name must be 64 characters or less, must start with a letter, and can only contain alphanumeric characters, dash (-), or underscore (_).',
          },
        };
      }
    }

    const version = SchemaRevisionVersionModel.safeParse(input.version);
    if (!version.success) {
      return { error: { message: version.error.issues[0]?.message ?? 'Invalid version.' } };
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
      service,
      version: version.data,
      digest,
      sdl: input.sdl,
      expiresAt: new Date(Date.now() + REVISION_RETENTION_MS),
    });
  }
}
