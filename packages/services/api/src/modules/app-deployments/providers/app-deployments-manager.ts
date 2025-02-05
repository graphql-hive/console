import { Injectable, Scope } from 'graphql-modules';
import * as GraphQLSchema from '../../../__generated__/types';
import { Target } from '../../../shared/entities';
import { batch } from '../../../shared/helpers';
import { InsufficientPermissionError, Session } from '../../auth/lib/authz';
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

  getStatusForAppDeployment(appDeployment: AppDeploymentRecord): AppDeploymentStatus {
    if (appDeployment.activatedAt) {
      return 'active';
    }

    if (appDeployment.retiredAt) {
      return 'retired';
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
      onError() {
        throw new InsufficientPermissionError('appDeployment:create');
      },
    });

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
  }) {
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.reference,
      onError() {
        throw new InsufficientPermissionError('appDeployment:create');
      },
    });

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
      onError() {
        throw new InsufficientPermissionError('appDeployment:publish');
      },
    });

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
    targetId: string;
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    const target = await this.targetManager.getTargetById({ targetId: args.targetId });

    await this.session.assertPerformAction({
      action: 'appDeployment:retire',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
        appDeploymentName: args.appDeployment.name,
      },
    });

    return await this.appDeployments.retireAppDeployment({
      organizationId: target.orgId,
      targetId: target.id,
      appDeployment: args.appDeployment,
    });
  }

  async getPaginatedDocumentsForAppDeployment(
    appDeployment: AppDeploymentRecord,
    args: {
      cursor: string | null;
      first: number | null;
    },
  ) {
    return await this.appDeployments.getPaginatedGraphQLDocuments({
      appDeploymentId: appDeployment.id,
      cursor: args.cursor,
      first: args.first,
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
}
