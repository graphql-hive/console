import { z } from 'zod';
import { psql } from '@hive/postgres';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import { defineTask, implementTask } from '../kit.js';
import type { MetricAlertRuleRow } from '../lib/metric-alert-evaluator.js';
import {
  sendSlackNotification,
  sendTeamsNotification,
  sendWebhookNotification,
  type AlertChannelRow,
  type NotificationEvent,
} from '../lib/metric-alert-notifier.js';

const tracer = trace.getTracer('metric-alert-evaluator');

export const SendMetricAlertChannelNotificationTask = defineTask({
  name: 'sendMetricAlertChannelNotification',
  schema: z.object({
    stateLogId: z.string().uuid(),
    channelId: z.string().uuid(),
  }),
});

type Row = {
  // state log
  fromState: MetricAlertRuleRow['state'];
  toState: MetricAlertRuleRow['state'];
  value: number;
  previousValue: number;
  stateLogCreatedAt: string;
  // rule (subset; the notifier only reads these fields off `event.rule`)
  ruleId: string;
  ruleName: string;
  ruleType: MetricAlertRuleRow['type'];
  ruleMetric: MetricAlertRuleRow['metric'];
  ruleThresholdType: MetricAlertRuleRow['thresholdType'];
  ruleThresholdValue: number;
  ruleDirection: MetricAlertRuleRow['direction'];
  ruleSeverity: MetricAlertRuleRow['severity'];
  organizationId: string;
  // channel
  channelId: string;
  channelType: AlertChannelRow['type'];
  channelName: string;
  slackChannel: string | null;
  webhookEndpoint: string | null;
  // slugs
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

export const task = implementTask(SendMetricAlertChannelNotificationTask, async args => {
  const { input, context, logger, helpers } = args;
  const { stateLogId, channelId } = input;

  // Wrap the whole task body in a single span so the PG lookups and outbound
  // Slack/Teams/Webhook POSTs (auto-instrumented via slonik + fetch) parent
  // under it. `notification.outcome` summarizes how the task exited so the
  // Failed-dispatches panel can filter on it.
  return tracer.startActiveSpan(
    'send-metric-alert-channel-notification',
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'state_log.id': stateLogId,
        'channel.id': channelId,
      },
    },
    async span => {
      let outcome: 'sent' | 'deduped' | 'skipped-deleted' | 'failed' = 'failed';
      // Hoisted so the finally block can compute breach-to-dispatch lag
      // regardless of whether the dispatch succeeded, failed, or threw. Stays
      // null when the SELECT didn't return a row (already-deduped or
      // skipped-deleted paths), in which case the lag attribute isn't set...
      // the dashboard filters on its presence.
      let stateLogCreatedAt: Date | null = null;
      try {
        // Skip if a previous attempt already recorded successful dispatch. This
        // covers the duplicate-job edge case; the per-attempt window where the
        // external call succeeded but our INSERT failed is unavoidable for
        // destinations without an idempotency-key API (Slack).
        //
        // Perf: this is a PK lookup on `(state_log_id, alert_channel_id)`
        // (PK defined in the metric-alert-rules migration)...sub-millisecond on
        // a warm cache. One extra round-trip per dispatch is a cheap price for
        // avoiding duplicate Slack messages to users when graphile-worker
        // retries a job whose external POST already succeeded.
        const alreadySent = await context.pg.maybeOneFirst(psql`
          SELECT 1
          FROM "metric_alert_notifications_sent"
          WHERE "state_log_id" = ${stateLogId} AND "alert_channel_id" = ${channelId}
        `);
        if (alreadySent) {
          logger.debug({ stateLogId, channelId }, 'Notification already dispatched, skipping');
          outcome = 'deduped';
          return;
        }

        // Single round-trip pulls everything dispatch needs. Returns null if the
        // state-log row, channel, or rule was deleted between enqueue and dispatch.
        const row = (await context.pg.maybeOne(psql`
          SELECT
            sl."from_state" as "fromState"
            , sl."to_state" as "toState"
            , sl."value"
            , sl."previous_value" as "previousValue"
            , sl."created_at" as "stateLogCreatedAt"
            , r."id" as "ruleId"
            , r."name" as "ruleName"
            , r."type" as "ruleType"
            , r."metric" as "ruleMetric"
            , r."threshold_type" as "ruleThresholdType"
            , r."threshold_value" as "ruleThresholdValue"
            , r."direction" as "ruleDirection"
            , r."severity" as "ruleSeverity"
            , r."organization_id" as "organizationId"
            , ac."id" as "channelId"
            , ac."type" as "channelType"
            , ac."name" as "channelName"
            , ac."slack_channel" as "slackChannel"
            , ac."webhook_endpoint" as "webhookEndpoint"
            , o."clean_id" as "organizationSlug"
            , p."clean_id" as "projectSlug"
            , t."clean_id" as "targetSlug"
          FROM "metric_alert_state_log" sl
          INNER JOIN "metric_alert_rules" r ON r."id" = sl."metric_alert_rule_id"
          INNER JOIN "alert_channels" ac ON ac."id" = ${channelId}
          INNER JOIN "targets" t ON t."id" = sl."target_id"
          INNER JOIN "projects" p ON p."id" = t."project_id"
          INNER JOIN "organizations" o ON o."id" = p."org_id"
          WHERE sl."id" = ${stateLogId}
        `)) as Row | null;

        if (!row) {
          logger.debug(
            { stateLogId, channelId },
            'State log or channel no longer exists, skipping notification',
          );
          outcome = 'skipped-deleted';
          return;
        }

        stateLogCreatedAt = new Date(row.stateLogCreatedAt);
        span.setAttributes({
          'rule.id': row.ruleId,
          'channel.type': row.channelType,
          'state_log.created_at': row.stateLogCreatedAt,
        });

        const event: NotificationEvent = {
          state: row.toState === 'FIRING' ? 'firing' : 'resolved',
          rule: {
            id: row.ruleId,
            organizationId: row.organizationId,
            // Only fields the notifier reads. Other MetricAlertRuleRow fields
            // aren't needed for message formatting and are omitted to keep the
            // payload narrow.
            projectId: '',
            targetId: '',
            name: row.ruleName,
            type: row.ruleType,
            timeWindowMinutes: 0,
            metric: row.ruleMetric,
            thresholdType: row.ruleThresholdType,
            thresholdValue: Number(row.ruleThresholdValue),
            direction: row.ruleDirection,
            severity: row.ruleSeverity,
            state: row.toState,
            stateChangedAt: null,
            confirmationMinutes: 0,
            savedFilterId: null,
            organizationPlanName: null,
          },
          currentValue: Number(row.value),
          previousValue: Number(row.previousValue),
          organizationSlug: row.organizationSlug,
          projectSlug: row.projectSlug,
          targetSlug: row.targetSlug,
        };

        const channel: AlertChannelRow = {
          id: row.channelId,
          type: row.channelType,
          name: row.channelName,
          slackChannel: row.slackChannel,
          webhookEndpoint: row.webhookEndpoint,
        };

        const idempotencyKey = `metric-alert:${stateLogId}:${channelId}`;

        switch (channel.type) {
          case 'SLACK':
            await sendSlackNotification({ channel, event, pg: context.pg, logger });
            break;
          case 'WEBHOOK':
            await sendWebhookNotification({
              channel,
              event,
              requestBroker: context.requestBroker,
              logger,
              idempotencyKey,
              attempt: helpers.job.attempts,
              maxAttempts: helpers.job.max_attempts,
            });
            break;
          case 'MSTEAMS_WEBHOOK':
            await sendTeamsNotification({
              channel,
              event,
              requestBroker: context.requestBroker,
              logger,
              idempotencyKey,
              attempt: helpers.job.attempts,
              maxAttempts: helpers.job.max_attempts,
            });
            break;
        }

        // Record successful dispatch. ON CONFLICT covers the rare case where a
        // concurrent retry (e.g. two workers picking up the job after a lock
        // timeout) both completed the external call.
        await context.pg.query(psql`
          INSERT INTO "metric_alert_notifications_sent" ("state_log_id", "alert_channel_id")
          VALUES (${stateLogId}, ${channelId})
          ON CONFLICT ("state_log_id", "alert_channel_id") DO NOTHING
        `);

        outcome = 'sent';
      } catch (err) {
        // outcome already initialized to 'failed'; record on the span for the
        // Failed-dispatches Grafana panel to filter by, then rethrow so
        // graphile-worker retries.
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        span.setAttribute('error.type', err instanceof Error ? err.name : 'unknown');
        throw err;
      } finally {
        span.setAttribute('notification.outcome', outcome);
        // End-to-end lag from breach (state-log row creation, i.e. when the
        // evaluator wrote the FIRING/RECOVERING/etc. transition) to now (this
        // task's exit). Captures graphile-worker queue + worker pickup + this
        // task's PG lookups + the outbound external POST. Only set when we
        // actually loaded the row...for the deduped / skipped-deleted exits,
        // there's no meaningful "breach → dispatch" measurement.
        if (stateLogCreatedAt) {
          span.setAttribute(
            'breach_to_dispatch_seconds',
            (Date.now() - stateLogCreatedAt.getTime()) / 1000,
          );
        }
        span.end();
      }
    },
  );
});
