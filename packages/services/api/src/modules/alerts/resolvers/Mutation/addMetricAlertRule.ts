import { Session } from '../../../auth/lib/authz';
import { METRIC_ALERT_RULES_PER_TARGET_LIMIT } from '../../../commerce/constants';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { METRIC_ALERT_RULES_ENABLED } from '../../providers/metric-alert-rules-flag-token';
import {
  MetricAlertRuleLimitExceededError,
  MetricAlertRulesStorage,
} from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addMetricAlertRule: NonNullable<MutationResolvers['addMetricAlertRule']> = async (
  _,
  { input },
  { injector, session },
) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId, targetId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);

  // Feature gate: cluster env-var OR per-org flag enables. Mirrors the
  // schemaProposals pattern at schema-proposal-storage.ts:66-70.
  if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
    const organization = await injector
      .get(OrganizationManager)
      .getOrganization({ organizationId });
    if (organization.featureFlags.metricAlertRules === false) {
      return {
        error: { message: 'Metric alert rules are not enabled for this instance.' },
      };
    }
  }

  await injector.get(Session).assertPerformAction({
    action: 'alert:modify',
    organizationId,
    params: { organizationId, projectId },
  });

  const currentUser = await session.getViewer();

  if (input.type === 'LATENCY' && !input.metric) {
    return {
      error: { message: 'Metric is required for LATENCY alert type.' },
    };
  }

  if (input.type !== 'LATENCY' && input.metric) {
    return {
      error: { message: 'Metric should only be set for LATENCY alert type.' },
    };
  }

  const storage = injector.get(MetricAlertRulesStorage);

  // Zero channels is intentionally allowed. Two reasons:
  //   1. ON DELETE CASCADE on alert_channels can leave a rule with zero
  //      channels post-creation (when the user deletes the only channel
  //      attached to a rule). Forbidding zero at create-time but tolerating
  //      it after channel deletion would be a confusing inconsistency.
  //   2. It enables a "test mode" workflow: create a rule, watch it move
  //      through state transitions without firing notifications, then
  //      attach channels once the rule's behavior is trusted.
  // The UI form mirrors this (no minimum-channels validation) so the
  // workflow is accessible without dropping into the API. A separate UI
  // badge surfaces zero-channel rules clearly so users don't accidentally
  // save a silent alert.
  //
  // Cross-scope validation: channels and the saved filter must belong to the
  // same project as the target. The DB FKs allow cross-project references on
  // their own; explicit checks close that gap.
  const channelProjectIds = await storage.getChannelProjectIds(input.channelIds);
  if (
    channelProjectIds.length !== input.channelIds.length ||
    channelProjectIds.some(id => id !== projectId)
  ) {
    return {
      error: {
        message: 'All notification channels must belong to the same project as the target.',
      },
    };
  }

  if (input.savedFilterId) {
    const filterProjectId = await storage.getSavedFilterProjectId(input.savedFilterId);
    if (filterProjectId !== projectId) {
      return {
        error: { message: 'Saved filter must belong to the same project as the target.' },
      };
    }
  }

  // Best-effort cap check. The race-safe guard inside the storage transaction
  // is what actually enforces the limit; this check just keeps the common
  // "user clicks submit at 10/10" path out of the transaction (and out of
  // the FOR UPDATE lock) entirely.
  const currentRuleCount = await storage.countMetricAlertRulesByTarget({ targetId });
  if (currentRuleCount >= METRIC_ALERT_RULES_PER_TARGET_LIMIT) {
    return {
      error: {
        message: `Limit of ${METRIC_ALERT_RULES_PER_TARGET_LIMIT} metric alert rules per target reached.`,
      },
    };
  }

  // The rule row + channel-link rows are written in a single transaction
  // inside `addMetricAlertRule` so a failure on either side rolls back the
  // other. Avoids the previously-possible "rule with no channels" partial
  // state when the channel insert errored after the rule was already
  // committed.
  let rule;
  try {
    rule = await storage.addMetricAlertRule({
      organizationId,
      projectId,
      targetId,
      createdByUserId: currentUser.id,
      type: input.type,
      timeWindowMinutes: input.timeWindowMinutes,
      metric: input.metric ?? null,
      thresholdType: input.thresholdType,
      thresholdValue: input.thresholdValue,
      direction: input.direction,
      severity: input.severity,
      name: input.name,
      confirmationMinutes: input.confirmationMinutes ?? 0,
      savedFilterId: input.savedFilterId ?? null,
      channelIds: input.channelIds,
    });
  } catch (error) {
    // The race-safe guard inside the transaction throws this when a
    // concurrent request commits between the resolver-layer count check and
    // this transaction's count + insert. Translates to the same structured
    // error the early check returns above.
    if (error instanceof MetricAlertRuleLimitExceededError) {
      return { error: { message: error.message } };
    }
    throw error;
  }

  return {
    ok: { addedMetricAlertRule: rule },
  };
};
