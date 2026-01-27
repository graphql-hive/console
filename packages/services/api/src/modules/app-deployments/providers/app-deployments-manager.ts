import { Injectable, Scope } from 'graphql-modules';
import * as GraphQLSchema from '../../../__generated__/types';
import { Target } from '../../../shared/entities';
import { batch } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { TargetManager } from '../../target/providers/target-manager';
import { AppDeployments, type AppDeploymentRecord } from './app-deployments';

export type AppDeploymentStatus = 'pending' | 'active' | 'retired';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class AppDeploymentsManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private session: Session,
    private targetManager: TargetManager,
    private appDeployments: AppDeployments,
    private idTranslator: IdTranslator,
  ) {
    this.logger = logger.child({ source: 'AppDeploymentsManager' });
  }

  async getAppDeploymentForTarget(
    target: Target,
    appDeploymentInput: {
      name: string;
      version: string;
    },
  ): Promise<null | AppDeploymentRecord> {
    const appDeployment = await this.appDeployments.findAppDeployment({
      targetId: target.id,
      name: appDeploymentInput.name,
      version: appDeploymentInput.version,
    });

    return appDeployment;
  }

  async getAppDeploymentById(args: {
    appDeploymentId: string;
  }): Promise<AppDeploymentRecord | null> {
    return await this.appDeployments.getAppDeploymentById(args);
  }

  getStatusForAppDeployment(appDeployment: AppDeploymentRecord): AppDeploymentStatus {
    if (appDeployment.retiredAt) {
      return 'retired';
    }

    if (appDeployment.activatedAt) {
      return 'active';
    }

    return 'pending';
  }

  async createAppDeployment(args: {
    reference: GraphQLSchema.TargetReferenceInput | null;
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.reference,
    });

    if (!selector) {
      this.session.raise('appDeployment:create');
    }

    await this.session.assertPerformAction({
      action: 'appDeployment:create',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        appDeploymentName: args.appDeployment.name,
      },
    });

    return await this.appDeployments.createAppDeployment({
      organizationId: selector.organizationId,
      targetId: selector.targetId,
      appDeployment: args.appDeployment,
    });
  }

  async addDocumentsToAppDeployment(args: {
    reference: GraphQLSchema.TargetReferenceInput | null;
    appDeployment: {
      name: string;
      version: string;
    };
    documents: ReadonlyArray<{
      hash: string;
      body: string;
    }>;
    isV1Format: boolean;
  }) {
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.reference,
    });

    if (!selector) {
      this.session.raise('appDeployment:create');
    }

    await this.session.assertPerformAction({
      action: 'appDeployment:create',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        appDeploymentName: args.appDeployment.name,
      },
    });

    return await this.appDeployments.addDocumentsToAppDeployment({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
      appDeployment: args.appDeployment,
      operations: args.documents,
      isV1Format: args.isV1Format,
    });
  }

  async activateAppDeployment(args: {
    reference: GraphQLSchema.TargetReferenceInput | null;
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.reference,
    });

    if (!selector) {
      this.session.raise('appDeployment:publish');
    }

    await this.session.assertPerformAction({
      action: 'appDeployment:publish',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        appDeploymentName: args.appDeployment.name,
      },
    });

    return await this.appDeployments.activateAppDeployment({
      organizationId: selector.organizationId,
      targetId: selector.targetId,
      appDeployment: args.appDeployment,
    });
  }

  async retireAppDeployment(args: {
    reference: GraphQLSchema.TargetReferenceInput | null;
    appDeployment: {
      name: string;
      version: string;
    };
    force?: boolean;
  }) {
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.reference,
    });

    if (!selector) {
      this.session.raise('appDeployment:retire');
    }

    await this.session.assertPerformAction({
      action: 'appDeployment:retire',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        appDeploymentName: args.appDeployment.name,
      },
    });

    return await this.appDeployments.retireAppDeployment({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
      appDeployment: args.appDeployment,
      force: args.force,
    });
  }

  async getPaginatedDocumentsForAppDeployment(
    appDeployment: AppDeploymentRecord,
    args: {
      cursor: string | null;
      first: number | null;
      operationName: string;
      schemaCoordinates: string[] | null;
    },
  ) {
    return await this.appDeployments.getPaginatedGraphQLDocuments({
      appDeploymentId: appDeployment.id,
      cursor: args.cursor,
      first: args.first,
      operationName: args.operationName,
      schemaCoordinates: args.schemaCoordinates,
    });
  }

  async getPaginatedAppDeploymentsForTarget(
    target: Target,
    args: { cursor: string | null; first: number | null },
  ) {
    return await this.appDeployments.getPaginatedAppDeployments({
      targetId: target.id,
      cursor: args.cursor,
      first: args.first,
    });
  }

  async getActiveAppDeploymentsForTarget(
    target: Target,
    args: {
      cursor: string | null;
      first: number | null;
      filter: {
        name?: string | null;
        lastUsedBefore?: string | null;
        neverUsedAndCreatedBefore?: string | null;
      };
    },
  ) {
    return await this.appDeployments.getActiveAppDeployments({
      targetId: target.id,
      cursor: args.cursor,
      first: args.first,
      filter: args.filter,
    });
  }

  getDocumentCountForAppDeployment = batch<AppDeploymentRecord, number>(async args => {
    const appDeploymentIds = args.map(appDeployment => appDeployment.id);
    const counts = await this.appDeployments.getDocumentCountForAppDeployments({
      appDeploymentIds,
    });
    const countMap = new Map<string, number>();
    for (const count of counts) {
      countMap.set(count.appDeploymentId, count.count);
    }

    return appDeploymentIds.map(id => Promise.resolve(countMap.get(id) ?? 0));
  });

  getLastUsedForAppDeployment = batch<AppDeploymentRecord, string | null>(async args => {
    const appDeploymentIds = args.map(appDeployment => appDeployment.id);
    const dates = await this.appDeployments.getLastUsedForAppDeployments({
      appDeploymentIds,
    });
    const dateMap = new Map<string, string | null>();
    for (const count of dates) {
      dateMap.set(count.appDeploymentId, count.lastUsed);
    }

    return appDeploymentIds.map(id => Promise.resolve(dateMap.get(id) ?? null));
  });

  async getExistingDocumentHashes(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    appName: string;
  }): Promise<
    { type: 'success'; hashes: string[] } | { type: 'error'; error: { message: string } }
  > {
    await this.session.assertPerformAction({
      action: 'appDeployment:create',
      organizationId: args.organizationId,
      params: {
        organizationId: args.organizationId,
        projectId: args.projectId,
        targetId: args.targetId,
        appDeploymentName: args.appName,
      },
    });

    const hashes = await this.appDeployments.getExistingDocumentHashes({
      targetId: args.targetId,
      appName: args.appName,
    });

    return {
      type: 'success',
      hashes,
    };
  }
}
