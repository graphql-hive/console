import { Injectable, Scope } from 'graphql-modules';
import type { CheckPolicyResponse, PolicyConfigurationObject } from '@hive/policy';
import { SchemaPolicy } from '../../../shared/entities';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import {
  OrganizationSelector,
  ProjectSelector,
  Storage,
  TargetSelector,
} from '../../shared/providers/storage';
import { SchemaPolicyApiProvider } from './schema-policy-api.provider';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class SchemaPolicyProvider {
  private logger: Logger;

  constructor(
    rootLogger: Logger,
    private storage: Storage,
    private session: Session,
    private auditLog: AuditLogRecorder,
    private api: SchemaPolicyApiProvider,
  ) {
    this.logger = rootLogger.child({ service: 'SchemaPolicyProvider' });
  }

  private mergePolicies(policies: SchemaPolicy[]): PolicyConfigurationObject {
    return policies.reduce((prev, policy) => {
      return {
        ...prev,
        ...policy.config,
      };
    }, {} as PolicyConfigurationObject);
  }

  private async _getCalculatedPolicyForTarget(selector: TargetSelector): Promise<{
    orgLevel: SchemaPolicy | null;
    projectLevel: SchemaPolicy | null;
    mergedPolicy: PolicyConfigurationObject | null;
  }> {
    const relevantPolicies = await this.storage.findInheritedPolicies(selector);
    const orgLevel = relevantPolicies.find(p => p.resource === 'ORGANIZATION') ?? null;
    let projectLevel = relevantPolicies.find(p => p.resource === 'PROJECT') ?? null;

    if (orgLevel && !orgLevel.allowOverrides) {
      projectLevel = null;
    }

    // We want to make sure they are applied in that order, to allow project level to override org level
    const policies = [orgLevel!, projectLevel!].filter(r => r !== null);

    if (policies.length === 0) {
      return {
        mergedPolicy: null,
        orgLevel: null,
        projectLevel: null,
      };
    }

    const mergedPolicy = this.mergePolicies(policies);

    if (Object.keys(mergedPolicy).length === 0) {
      return {
        mergedPolicy: null,
        orgLevel,
        projectLevel,
      };
    }

    return {
      mergedPolicy,
      orgLevel,
      projectLevel,
    };
  }

  async checkPolicy(
    completeSchema: string,
    modifiedSdl: string,
    selector: TargetSelector,
  ): Promise<
    | null
    | { success: true; warnings: CheckPolicyResponse }
    | {
        success: false;
        warnings: CheckPolicyResponse;
        errors: CheckPolicyResponse;
      }
  > {
    const { mergedPolicy } = await this._getCalculatedPolicyForTarget(selector);

    if (!mergedPolicy) {
      return null;
    }

    const results = await this.api.checkPolicy({
      target: selector.targetId,
      policy: mergedPolicy,
      schema: completeSchema,
      source: modifiedSdl,
    });

    const warnings = results.filter(r => r.severity === 1);
    const errors = results.filter(r => r.severity === 2);

    if (errors.length === 0) {
      return {
        success: true,
        warnings,
      };
    }

    return {
      success: false,
      warnings,
      errors,
    };
  }

  async setOrganizationPolicy(
    selector: OrganizationSelector,
    policy: any,
    allowOverrides: boolean,
  ) {
    await this.session.assertPerformAction({
      action: 'schemaLinting:modifyOrganizationRules',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    const result = await this.storage.setSchemaPolicyForOrganization({
      organizationId: selector.organizationId,
      policy,
      allowOverrides,
    });

    await this.auditLog.record({
      eventType: 'ORGANIZATION_POLICY_UPDATED',
      organizationId: selector.organizationId,
      metadata: {
        allowOverrides: allowOverrides,
        updatedFields: JSON.stringify({
          policy: policy,
        }),
      },
    });

    return result;
  }

  async setProjectPolicy(selector: ProjectSelector, policy: any) {
    await this.session.assertPerformAction({
      action: 'schemaLinting:modifyProjectRules',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const result = await this.storage.setSchemaPolicyForProject({
      projectId: selector.projectId,
      policy,
    });

    await this.auditLog.record({
      eventType: 'PROJECT_POLICY_UPDATED',
      organizationId: selector.organizationId,
      metadata: {
        projectId: selector.projectId,
        policy: JSON.stringify(policy),
      },
    });

    return result;
  }

  async getOrganizationPolicy(selector: OrganizationSelector) {
    await this.session.assertPerformAction({
      action: 'schemaLinting:modifyOrganizationRules',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    return this.storage.getSchemaPolicyForOrganization(selector.organizationId);
  }

  async getOrganizationPolicyForProject(selector: ProjectSelector) {
    await this.session.assertPerformAction({
      action: 'schemaLinting:modifyProjectRules',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    return this.storage.getSchemaPolicyForOrganization(selector.organizationId);
  }

  async getProjectPolicy(selector: ProjectSelector) {
    await this.session.assertPerformAction({
      action: 'schemaLinting:modifyProjectRules',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    return this.storage.getSchemaPolicyForProject(selector.projectId);
  }
}
