import type {
  Alert,
  AlertChannel,
  DateRange,
  MetricAlertIncident,
  MetricAlertRule,
  MetricAlertStateLogEntry,
} from '../../shared/entities';

/**
 * Channel resolvers authorize per organization, but the entity only carries the project; every
 * resolver that returns a channel attaches the organization it was reached through.
 */
export type AlertChannelMapper = AlertChannel & { organizationId: string };
export type AlertSlackChannelMapper = AlertChannelMapper;
export type AlertWebhookChannelMapper = AlertChannelMapper;
export type TeamsWebhookChannelMapper = AlertChannelMapper;
export type DiscordWebhookChannelMapper = AlertChannelMapper;
/** The selection the stats fields read for; each field runs its own query, like OperationsStats. */
export type AlertChannelDeliveryStatsMapper = {
  organizationId: string;
  projectId: string;
  channelId: string;
  period: DateRange;
};
export type AlertMapper = Alert;
export type MetricAlertRuleMapper = MetricAlertRule;
export type MetricAlertRuleIncidentMapper = MetricAlertIncident;
export type MetricAlertRuleStateChangeMapper = MetricAlertStateLogEntry;
