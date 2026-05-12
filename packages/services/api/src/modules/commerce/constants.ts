export const USAGE_DEFAULT_LIMITATIONS: Record<
  'HOBBY' | 'PRO' | 'ENTERPRISE',
  { operations: number; retention: number }
> = {
  HOBBY: {
    operations: 1_000_000,
    retention: 7,
  },
  PRO: {
    operations: 0,
    retention: 90,
  },
  ENTERPRISE: {
    operations: 0, // unlimited
    retention: 365,
  },
};

/**
 * How long alert state-log rows are kept before being purged by the
 * `purgeExpiredAlertStateLog` cron task. The evaluation engine snapshots this
 * value into `metric_alert_state_log.expires_at` at insert time based on the
 * organization's plan, so changing the constant only affects new rows.
 */
export const ALERT_STATE_LOG_RETENTION_DAYS: Record<'HOBBY' | 'PRO' | 'ENTERPRISE', number> = {
  HOBBY: 7,
  PRO: 7,
  ENTERPRISE: 30,
};

/**
 * Maximum number of metric alert rules permitted per target. Flat across all
 * plans so the UX is predictable and free-tier users hit the same ceiling
 * paid users do. Counted against every row (enabled or disabled) so a user
 * cannot circumvent the cap by toggling rules off.
 */
export const METRIC_ALERT_RULES_PER_TARGET_LIMIT = 10;
