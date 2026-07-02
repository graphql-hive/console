import { z } from 'zod';
import { psql } from '@hive/postgres';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import { defineTask, implementTask } from '../kit.js';
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

const HydrationRowSchema = z.object({
  // state log
  fromState: z.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  toState: z.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  value: z.number(),
  previousValue: z.number(),
  stateLogCreatedAt: z.string(),
  // rule (subset; the notifier only reads these fields off `event.rule`)
  ruleId: z.string(),
  ruleName: z.string(),
  ruleType: z.enum(['LATENCY', 'ERROR_RATE', 'TRAFFIC']),
  ruleMetric: z.enum(['AVG', 'P75', 'P90', 'P95', 'P99']).nullable(),
  ruleThresholdType: z.enum(['FIXED_VALUE', 'PERCENTAGE_CHANGE']),
  ruleThresholdValue: z.number(),
  ruleDirection: z.enum(['ABOVE', 'BELOW']),
  ruleSeverity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  organizationId: z.string(),
  // channel
  channelId: z.string(),
  channelType: z.enum(['SLACK', 'WEBHOOK', 'MSTEAMS_WEBHOOK']),
  channelName: z.string(),
  slackChannel: z.string().nullable(),
  webhookEndpoint: z.string().nullable(),
  // slugs
  organizationSlug: z.string(),
  projectSlug: z.string(),
  targetSlug: z.string(),
});

type Row = z.infer<typeof HydrationRowSchema>;

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
      let outcome: 'sent' | 'deduped' | 'skipped-deleted' | 'degraded' | 'failed' = 'failed';
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
        const rawRow = await context.pg.maybeOne(psql`
          SELECT
            sl."from_state" as "fromState"
            , sl."to_state" as "toState"
            , sl."value"
            , sl."previous_value" as "previousValue"
            , to_json(sl."created_at") as "stateLogCreatedAt"
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
        `);
        const row: Row | null = rawRow === null ? null : HydrationRowSchema.parse(rawRow);

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
            organizationId: row.organizationId,
            name: row.ruleName,
            type: row.ruleType,
            metric: row.ruleMetric,
            severity: row.ruleSeverity,
            thresholdType: row.ruleThresholdType,
            thresholdValue: Number(row.ruleThresholdValue),
            direction: row.ruleDirection,
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

        // A successful delivery clears any prior degraded marker for this pair.
        await context.pg.query(psql`
          DELETE FROM "metric_alert_channel_health"
          WHERE "metric_alert_rule_id" = ${row.ruleId} AND "alert_channel_id" = ${channelId}
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

        // Final attempt failed → the delivery is dropped. Record the (rule,
        // channel) pair as degraded so the rule UI can warn. Best-effort: a
        // failure here must never mask the original send error.
        if (helpers.job.attempts >= helpers.job.max_attempts) {
          outcome = 'degraded';
          try {
            const lastError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
            await context.pg.query(psql`
              INSERT INTO "metric_alert_channel_health"
                ("metric_alert_rule_id", "alert_channel_id", "degraded_at", "last_error")
              SELECT sl."metric_alert_rule_id", ${channelId}, now(), ${lastError}
              FROM "metric_alert_state_log" sl
              WHERE sl."id" = ${stateLogId}
              ON CONFLICT ("metric_alert_rule_id", "alert_channel_id")
              DO UPDATE SET "degraded_at" = now(), "last_error" = EXCLUDED."last_error"
            `);
          } catch (healthErr) {
            logger.error(
              { error: healthErr, stateLogId, channelId },
              'Failed to record metric alert channel health',
            );
          }
        }

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
