import { Injectable, Scope } from 'graphql-modules';
import { batch } from '@theguild/buddy';
import { Target } from '../../../shared/entities';
import { AuthManager } from '../../auth/providers/auth-manager';
import { TargetAccessScope } from '../../auth/providers/scopes';
import { Logger } from '../../shared/providers/logger';
import { TargetManager } from '../../target/providers/target-manager';
import { TokenStorage } from '../../token/providers/token-storage';
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
    private auth: AuthManager,
    private tokenStorage: TokenStorage,
    private targetManager: TargetManager,
    private appDeployments: AppDeployments,
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
    await this.auth.ensureTargetAccess({
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      scope: TargetAccessScope.READ,
    });

    const appDeployment = await this.appDeployments.findAppDeployment({
      targetId: target.id,
      name: appDeploymentInput.name,
      version: appDeploymentInput.version,
    });

    if (!appDeployment) {
      return null;
    }

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
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    const token = this.auth.ensureApiToken();
    const tokenRecord = await this.tokenStorage.getToken({ token });

    await this.auth.ensureTargetAccess({
      organization: tokenRecord.organization,
      project: tokenRecord.project,
      target: tokenRecord.target,
      scope: TargetAccessScope.REGISTRY_WRITE,
    });

    return await this.appDeployments.createAppDeployment({
      organizationId: tokenRecord.organization,
      targetId: tokenRecord.target,
      appDeployment: args.appDeployment,
    });
  }

  async addDocumentsToAppDeployment(args: {
    appDeployment: {
      name: string;
      version: string;
    };
    documents: ReadonlyArray<{
      hash: string;
      body: string;
    }>;
  }) {
    const token = this.auth.ensureApiToken();
    const tokenRecord = await this.tokenStorage.getToken({ token });

    await this.auth.ensureTargetAccess({
      organization: tokenRecord.organization,
      project: tokenRecord.project,
      target: tokenRecord.target,
      scope: TargetAccessScope.REGISTRY_WRITE,
    });

    return await this.appDeployments.addDocumentsToAppDeployment({
      organizationId: tokenRecord.organization,
      projectId: tokenRecord.project,
      targetId: tokenRecord.target,
      appDeployment: args.appDeployment,
      operations: args.documents,
    });
  }

  async activateAppDeployment(args: {
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    const token = this.auth.ensureApiToken();
    const tokenRecord = await this.tokenStorage.getToken({ token });

    await this.auth.ensureTargetAccess({
      organization: tokenRecord.organization,
      project: tokenRecord.project,
      target: tokenRecord.target,
      scope: TargetAccessScope.REGISTRY_WRITE,
    });

    return await this.appDeployments.activateAppDeployment({
      organizationId: tokenRecord.organization,
      targetId: tokenRecord.target,
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

    await this.auth.ensureTargetAccess({
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      scope: TargetAccessScope.REGISTRY_WRITE,
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
    await this.auth.ensureTargetAccess({
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      scope: TargetAccessScope.READ,
    });

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
