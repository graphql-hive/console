import type {
  Alert,
  AlertChannel,
  MetricAlertIncident,
  MetricAlertRule,
  MetricAlertStateLogEntry,
} from '../../shared/entities';

export type AlertChannelMapper = AlertChannel;
export type AlertSlackChannelMapper = AlertChannel;
export type AlertWebhookChannelMapper = AlertChannel;
export type TeamsWebhookChannelMapper = AlertChannel;
export type AlertMapper = Alert;
export type MetricAlertRuleMapper = MetricAlertRule;
export type MetricAlertRuleIncidentMapper = MetricAlertIncident;
export type MetricAlertRuleStateChangeMapper = MetricAlertStateLogEntry;
