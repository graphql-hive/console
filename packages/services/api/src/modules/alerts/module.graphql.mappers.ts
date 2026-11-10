import type {
  Alert,
  AlertChannel,
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
export type AlertMapper = Alert;
export type MetricAlertRuleMapper = MetricAlertRule;
export type MetricAlertRuleIncidentMapper = MetricAlertIncident;
export type MetricAlertRuleStateChangeMapper = MetricAlertStateLogEntry;
