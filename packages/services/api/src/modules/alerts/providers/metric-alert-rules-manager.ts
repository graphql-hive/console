import { Inject, Injectable, Scope } from 'graphql-modules';
import type { MetricAlertRule } from '../../../shared/entities';
import { Session } from '../../auth/lib/authz';
import {
  METRIC_ALERT_RULE_TIME_WINDOW_MAX_MINUTES,
  METRIC_ALERT_RULE_TIME_WINDOW_MIN_MINUTES,
  METRIC_ALERT_RULES_PER_TARGET_LIMIT,
} from '../../commerce/constants';
import { OrganizationManager } from '../../organization/providers/organization-manager';
import { Logger } from '../../shared/providers/logger';
import { METRIC_ALERT_RULES_ENABLED } from './metric-alert-rules-flag-token';
import {
  MetricAlertRuleLimitExceededError,
  MetricAlertRulesStorage,
} from './metric-alert-rules-storage';

/**
 * Thrown when an `input.type` / `input.metric` combination is invalid (e.g.
 * `LATENCY` without a metric, or non-`LATENCY` with one set), or when
 * `timeWindowMinutes` is outside the allowed range. The resolver catches and
 * translates into the structured `{ error: { message } }` mutation result.
 */
export class MetricAlertRuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetricAlertRuleValidationError';
  }
}

/**
 * Thrown when a referenced channel or saved filter belongs to a different
 * project than the rule's target. The DB foreign keys allow cross-project
 * references on their own; this guard closes that gap at the API boundary.
 */
export class MetricAlertRuleCrossScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetricAlertRuleCrossScopeError';
  }
}

/**
 * Thrown when the metric-alerts feature is not enabled for the calling
 * organization (cluster env-var off AND per-org flag off). Distinct from
 * `MetricAlertRuleValidationError` so the resolver can emit a more specific
 * message and the UI can surface it differently if needed.
 */
export class MetricAlertRulesDisabledError extends Error {
  constructor() {
    super('Metric alert rules are not enabled for this instance.');
    this.name = 'MetricAlertRulesDisabledError';
  }
}

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class MetricAlertRulesManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private session: Session,
    private storage: MetricAlertRulesStorage,
    private organizationManager: OrganizationManager,
    @Inject(METRIC_ALERT_RULES_ENABLED) private clusterFlagEnabled: boolean,
  ) {
    this.logger = logger.child({ source: 'MetricAlertRulesManager' });
  }

  /**
   * OR-style feature gate: cluster env-var OR per-org flag enables the
   * feature. Used by field resolvers that should silently return empty / null
   * when the feature is off rather than erroring.
   */
  async isEnabled(organizationId: string): Promise<boolean> {
    if (this.clusterFlagEnabled === true) {
      return true;
    }
    const organization = await this.organizationManager.getOrganization({ organizationId });
    return organization.featureFlags.metricAlertRules;
  }

  /**
   * Mutation-side counterpart to `isEnabled`. Throws if the feature is
   * disabled so the resolver can return the structured error response. The
   * existing `isEnabled` check inside the resolver gate path is reused so
   * both paths share one source of truth for the gate semantics.
   */
  async assertEnabled(organizationId: string): Promise<void> {
    if (!(await this.isEnabled(organizationId))) {
      throw new MetricAlertRulesDisabledError();
    }
  }

  async createRule(input: {
    organizationId: string;
    projectId: string;
    targetId: string;
    type: MetricAlertRule['type'];
    metric: MetricAlertRule['metric'];
    timeWindowMinutes: number;
    thresholdType: MetricAlertRule['thresholdType'];
    thresholdValue: number;
    direction: MetricAlertRule['direction'];
    severity: MetricAlertRule['severity'];
    name: string;
    confirmationMinutes: number | null | undefined;
    savedFilterId: string | null | undefined;
    channelIds: readonly string[];
  }): Promise<MetricAlertRule> {
    await this.assertEnabled(input.organizationId);

    await this.session.assertPerformAction({
      action: 'alert:modify',
      organizationId: input.organizationId,
      params: { organizationId: input.organizationId, projectId: input.projectId },
    });

    this.assertTypeMetricPairing(input.type, input.metric);
    this.assertTimeWindowInRange(input.timeWindowMinutes);

    // Channels and the saved filter must belong to the same project as the
    // target. The DB foreign keys allow cross-project references on their
    // own; explicit checks close that gap.
    await this.assertChannelsBelongToProject(input.channelIds, input.projectId);
    if (input.savedFilterId) {
      await this.assertSavedFilterBelongsToProject(input.savedFilterId, input.projectId);
    }

    // Best-effort cap check. The race-safe guard inside the storage
    // transaction is what actually enforces the limit; this check just keeps
    // the common "user clicks submit at 10/10" path out of the transaction
    // (and out of the FOR UPDATE lock) entirely.
    const currentRuleCount = await this.storage.countMetricAlertRulesByTarget({
      targetId: input.targetId,
    });
    if (currentRuleCount >= METRIC_ALERT_RULES_PER_TARGET_LIMIT) {
      throw new MetricAlertRuleLimitExceededError(METRIC_ALERT_RULES_PER_TARGET_LIMIT);
    }

    const currentUser = await this.session.getViewer();

    this.logger.debug(
      'Creating metric alert rule (organization=%s, project=%s, target=%s, type=%s)',
      input.organizationId,
      input.projectId,
      input.targetId,
      input.type,
    );

    return this.storage.addMetricAlertRule({
      organizationId: input.organizationId,
      projectId: input.projectId,
      targetId: input.targetId,
      createdByUserId: currentUser.id,
      type: input.type,
      timeWindowMinutes: input.timeWindowMinutes,
      metric: input.metric,
      thresholdType: input.thresholdType,
      thresholdValue: input.thresholdValue,
      direction: input.direction,
      severity: input.severity,
      name: input.name,
      confirmationMinutes: input.confirmationMinutes ?? 0,
      savedFilterId: input.savedFilterId ?? null,
      channelIds: input.channelIds,
    });
  }

  async updateRule(input: {
    organizationId: string;
    projectId: string;
    ruleId: string;
    // Every field below is optional...partial update.
    type?: MetricAlertRule['type'] | null;
    metric?: MetricAlertRule['metric'] | null;
    timeWindowMinutes?: number | null;
    thresholdType?: MetricAlertRule['thresholdType'] | null;
    thresholdValue?: number | null;
    direction?: MetricAlertRule['direction'] | null;
    severity?: MetricAlertRule['severity'] | null;
    name?: string | null;
    confirmationMinutes?: number | null;
    savedFilterId?: string | null;
    enabled?: boolean | null;
    channelIds?: readonly string[] | null;
  }): Promise<MetricAlertRule> {
    await this.assertEnabled(input.organizationId);

    await this.session.assertPerformAction({
      action: 'alert:modify',
      organizationId: input.organizationId,
      params: { organizationId: input.organizationId, projectId: input.projectId },
    });

    const existing = await this.storage.getMetricAlertRule({ id: input.ruleId });
    if (!existing || existing.projectId !== input.projectId) {
      throw new MetricAlertRuleValidationError('Metric alert rule not found.');
    }

    // Validate the type/metric pairing against the EFFECTIVE values after the
    // partial update applies, not just the values being changed in this call.
    const effectiveType = input.type ?? existing.type;
    const effectiveMetric = input.metric !== undefined ? input.metric : existing.metric;
    this.assertTypeMetricPairing(effectiveType, effectiveMetric);

    if (input.timeWindowMinutes != null) {
      this.assertTimeWindowInRange(input.timeWindowMinutes);
    }

    if (input.channelIds) {
      await this.assertChannelsBelongToProject(input.channelIds, input.projectId);
    }

    if (input.savedFilterId) {
      await this.assertSavedFilterBelongsToProject(input.savedFilterId, input.projectId);
    }

    const currentUser = await this.session.getViewer();

    this.logger.debug(
      'Updating metric alert rule (organization=%s, project=%s, rule=%s)',
      input.organizationId,
      input.projectId,
      input.ruleId,
    );

    const updated = await this.storage.updateMetricAlertRule({
      id: input.ruleId,
      updatedByUserId: currentUser.id,
      type: input.type ?? undefined,
      timeWindowMinutes: input.timeWindowMinutes ?? undefined,
      metric: input.metric ?? undefined,
      thresholdType: input.thresholdType ?? undefined,
      thresholdValue: input.thresholdValue ?? undefined,
      direction: input.direction ?? undefined,
      severity: input.severity ?? undefined,
      name: input.name ?? undefined,
      confirmationMinutes: input.confirmationMinutes ?? undefined,
      savedFilterId: input.savedFilterId ?? undefined,
      enabled: input.enabled ?? undefined,
      channelIds: input.channelIds ?? undefined,
    });

    if (!updated) {
      throw new MetricAlertRuleValidationError('Failed to update metric alert rule.');
    }
    return updated;
  }

  async deleteRules(input: {
    organizationId: string;
    projectId: string;
    ruleIds: readonly string[];
  }): Promise<string[]> {
    await this.assertEnabled(input.organizationId);

    await this.session.assertPerformAction({
      action: 'alert:modify',
      organizationId: input.organizationId,
      params: { organizationId: input.organizationId, projectId: input.projectId },
    });

    this.logger.debug(
      'Deleting metric alert rules (organization=%s, project=%s, count=%s)',
      input.organizationId,
      input.projectId,
      input.ruleIds.length,
    );

    const deleted = await this.storage.deleteMetricAlertRules({
      projectId: input.projectId,
      ruleIds: [...input.ruleIds],
    });
    return deleted.map(r => r.id);
  }

  // --- Private validation helpers ---

  private assertTypeMetricPairing(
    type: MetricAlertRule['type'],
    metric: MetricAlertRule['metric'] | null,
  ): void {
    if (type === 'LATENCY' && !metric) {
      throw new MetricAlertRuleValidationError('Metric is required for LATENCY alert type.');
    }
    if (type !== 'LATENCY' && metric) {
      throw new MetricAlertRuleValidationError('Metric should only be set for LATENCY alert type.');
    }
  }

  private assertTimeWindowInRange(timeWindowMinutes: number): void {
    if (
      !Number.isInteger(timeWindowMinutes) ||
      timeWindowMinutes < METRIC_ALERT_RULE_TIME_WINDOW_MIN_MINUTES ||
      timeWindowMinutes > METRIC_ALERT_RULE_TIME_WINDOW_MAX_MINUTES
    ) {
      throw new MetricAlertRuleValidationError(
        `Time window must be a whole number of minutes between ${METRIC_ALERT_RULE_TIME_WINDOW_MIN_MINUTES} and ${METRIC_ALERT_RULE_TIME_WINDOW_MAX_MINUTES} (30 days).`,
      );
    }
  }

  private async assertChannelsBelongToProject(
    channelIds: readonly string[],
    projectId: string,
  ): Promise<void> {
    const channelProjectIds = await this.storage.getChannelProjectIds(channelIds);
    if (
      channelProjectIds.length !== channelIds.length ||
      channelProjectIds.some(id => id !== projectId)
    ) {
      throw new MetricAlertRuleCrossScopeError(
        'All notification channels must belong to the same project as the target.',
      );
    }
  }

  private async assertSavedFilterBelongsToProject(
    savedFilterId: string,
    projectId: string,
  ): Promise<void> {
    const filterProjectId = await this.storage.getSavedFilterProjectId(savedFilterId);
    if (filterProjectId !== projectId) {
      throw new MetricAlertRuleCrossScopeError(
        'Saved filter must belong to the same project as the target.',
      );
    }
  }
}
