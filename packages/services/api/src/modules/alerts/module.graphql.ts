import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    addAlertChannel(input: AddAlertChannelInput!): AddAlertChannelResult!
    deleteAlertChannels(input: DeleteAlertChannelsInput!): DeleteAlertChannelsResult!
    addAlert(input: AddAlertInput!): AddAlertResult!
    deleteAlerts(input: DeleteAlertsInput!): DeleteAlertsResult!
  }

  extend type Project {
    alertChannels: [AlertChannel!]
    alerts: [Alert!]
  }

  extend type SavedFilter {
    """
    Number of metric alert rules that reference this filter. When greater than 0
    the filter cannot be deleted — it must first be detached from those alerts.
    """
    usedByAlertRulesCount: Int!
  }

  enum AlertChannelType {
    SLACK
    WEBHOOK
    MSTEAMS_WEBHOOK
  }

  enum AlertType {
    SCHEMA_CHANGE_NOTIFICATIONS
  }

  type DeleteAlertChannelsResult {
    ok: DeleteAlertChannelsOk
    error: DeleteAlertChannelsError
  }

  type DeleteAlertChannelsOk {
    updatedProject: Project!
  }

  type DeleteAlertChannelsError implements Error {
    message: String!
  }

  type AddAlertResult {
    ok: AddAlertOk
    error: AddAlertError
  }

  type AddAlertOk {
    updatedProject: Project!
    addedAlert: Alert!
  }

  type AddAlertError implements Error {
    message: String!
  }

  type DeleteAlertsResult {
    ok: DeleteAlertsOk
    error: DeleteAlertsError
  }

  type DeleteAlertsOk {
    updatedProject: Project!
  }

  type DeleteAlertsError implements Error {
    message: String!
  }

  type AddAlertChannelResult {
    ok: AddAlertChannelOk
    error: AddAlertChannelError
  }

  type AddAlertChannelOk {
    updatedProject: Project!
    addedAlertChannel: AlertChannel!
  }

  type AddAlertChannelError implements Error {
    message: String!
    inputErrors: AddAlertChannelInputErrors!
  }

  type AddAlertChannelInputErrors {
    name: String
    webhookEndpoint: String
    slackChannel: String
  }

  input AddAlertChannelInput {
    organizationSlug: String!
    projectSlug: String!
    name: String!
    type: AlertChannelType!
    slack: SlackChannelInput
    webhook: WebhookChannelInput
  }

  input SlackChannelInput {
    channel: String!
  }

  input WebhookChannelInput {
    endpoint: String!
  }

  input DeleteAlertChannelsInput {
    organizationSlug: String!
    projectSlug: String!
    channelIds: [ID!]!
  }

  input AddAlertInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    channelId: ID!
    type: AlertType!
  }

  input DeleteAlertsInput {
    organizationSlug: String!
    projectSlug: String!
    alertIds: [ID!]!
  }

  interface AlertChannel {
    id: ID!
    name: String!
    type: AlertChannelType!
  }

  type AlertSlackChannel implements AlertChannel {
    id: ID!
    name: String!
    type: AlertChannelType!
    channel: String!
  }

  type AlertWebhookChannel implements AlertChannel {
    id: ID!
    name: String!
    type: AlertChannelType!
    endpoint: String!
  }

  type TeamsWebhookChannel implements AlertChannel {
    id: ID!
    name: String!
    type: AlertChannelType!
    endpoint: String!
  }

  type Alert {
    id: ID!
    type: AlertType!
    channel: AlertChannel!
    target: Target!
  }

  # --- Metric Alert Rules ---

  enum MetricAlertRuleType {
    LATENCY
    ERROR_RATE
    TRAFFIC
  }

  enum MetricAlertRuleMetric {
    AVG
    P75
    P90
    P95
    P99
  }

  enum MetricAlertRuleThresholdType {
    FIXED_VALUE
    PERCENTAGE_CHANGE
  }

  enum MetricAlertRuleDirection {
    ABOVE
    BELOW
  }

  enum MetricAlertRuleSeverity {
    INFO
    WARNING
    CRITICAL
  }

  enum MetricAlertRuleState {
    NORMAL
    PENDING
    FIRING
    RECOVERING
  }

  type MetricAlertRule {
    id: ID!
    name: String!
    type: MetricAlertRuleType!
    """
    Destinations that receive notifications when this rule fires or resolves.
    """
    channels: [AlertChannel!]!
    timeWindowMinutes: Int!
    metric: MetricAlertRuleMetric
    thresholdType: MetricAlertRuleThresholdType!
    thresholdValue: Float!
    direction: MetricAlertRuleDirection!
    severity: MetricAlertRuleSeverity!
    state: MetricAlertRuleState!
    confirmationMinutes: Int!
    enabled: Boolean!
    lastEvaluatedAt: DateTime
    """
    Most recent time this rule transitioned PENDING → FIRING (null if never fired).
    """
    lastTriggeredAt: DateTime
    createdAt: DateTime!
    createdBy: User
    updatedAt: DateTime!
    updatedBy: User
    """
    The saved filter that scopes this rule (null = applies to the whole target).
    """
    savedFilter: SavedFilter
    """
    Count of state transitions logged for this rule in the given time range.
    """
    eventCount(from: DateTime!, to: DateTime!): Int!
    """
    The currently open incident, if any.
    """
    currentIncident: MetricAlertRuleIncident
    """
    Past incidents for this alert rule, paginated newest-first.
    """
    incidents(first: Int, after: String): MetricAlertRuleIncidentConnection!
    """
    State change history for this rule (powers the state timeline).
    """
    stateLog(from: DateTime!, to: DateTime!): [MetricAlertRuleStateChange!]!
  }

  type MetricAlertRuleIncident {
    id: ID!
    startedAt: DateTime!
    resolvedAt: DateTime
    currentValue: Float!
    previousValue: Float
    thresholdValue: Float!
    """
    State-log entries that belong to this incident, oldest first. Includes the
    PENDING→FIRING transition that opened it, any FIRING↔RECOVERING flapping,
    and (for resolved incidents) the RECOVERING→NORMAL transition that closed
    it. Entries are subject to plan-gated retention; rows that have aged out
    are no longer returned.
    """
    stateLog: [MetricAlertRuleStateChange!]!
  }

  type MetricAlertRuleIncidentEdge {
    node: MetricAlertRuleIncident!
    cursor: String!
  }

  type MetricAlertRuleIncidentConnection {
    edges: [MetricAlertRuleIncidentEdge!]!
    pageInfo: PageInfo!
  }

  type MetricAlertRuleStateChange {
    id: ID!
    fromState: MetricAlertRuleState!
    toState: MetricAlertRuleState!
    """
    Metric value in the current window at transition time.
    """
    value: Float
    """
    Metric value in the previous (comparison) window at transition time.
    """
    previousValue: Float
    """
    Threshold value snapshotted at transition time (survives rule edits).
    """
    thresholdValue: Float
    createdAt: DateTime!
    """
    The rule that produced this transition. Nullable to tolerate the brief
    race between fetching a state-log entry and resolving its rule when the
    rule has been deleted (which cascade-deletes the state-log row itself).
    Frontend list views filter entries with null rules at render time.
    """
    rule: MetricAlertRule
  }

  extend type Target {
    """
    State changes across all alert rules for this target (powers the alert events chart + list).
    """
    metricAlertRuleStateLog(from: DateTime!, to: DateTime!): [MetricAlertRuleStateChange!]!
    """
    How many days of alert state-log history are retained for the organization
    that owns this target. Plan-gated; HOBBY/PRO get 7 days, ENTERPRISE gets 30.
    The frontend uses this to bound the activity-page date-range picker.
    """
    metricAlertStateLogRetentionDays: Int!
    """
    Maximum metric alert rules permitted per target. Flat across all plans.
    The frontend reads this to render an "X of N rules" indicator and to
    disable the "Add rule" affordance when the cap is reached.
    """
    metricAlertRulesLimit: Int!
  }

  extend type Target {
    metricAlertRules: [MetricAlertRule!]!
    """
    A single metric alert rule scoped to this target. Returns null if the id does not
    resolve to a rule belonging to this target.
    """
    metricAlertRule(id: ID!): MetricAlertRule
    """
    True when the cluster-wide kill-switch is enabled OR this organization has
    opted in via its per-org feature flag. Used by the frontend to hide alert
    routes/links when neither gate allows the feature.
    """
    viewerCanUseMetricAlertRules: Boolean!
  }

  extend type Mutation {
    addMetricAlertRule(input: AddMetricAlertRuleInput!): AddMetricAlertRuleResult!
    updateMetricAlertRule(input: UpdateMetricAlertRuleInput!): UpdateMetricAlertRuleResult!
    deleteMetricAlertRules(input: DeleteMetricAlertRulesInput!): DeleteMetricAlertRulesResult!
  }

  input AddMetricAlertRuleInput {
    target: TargetReferenceInput!
    name: String!
    type: MetricAlertRuleType!
    timeWindowMinutes: Int!
    metric: MetricAlertRuleMetric
    thresholdType: MetricAlertRuleThresholdType!
    thresholdValue: Float!
    direction: MetricAlertRuleDirection!
    severity: MetricAlertRuleSeverity!
    confirmationMinutes: Int
    channelIds: [ID!]!
    savedFilterId: ID
  }

  input UpdateMetricAlertRuleInput {
    project: ProjectReferenceInput!
    ruleId: ID!
    name: String
    type: MetricAlertRuleType
    timeWindowMinutes: Int
    metric: MetricAlertRuleMetric
    thresholdType: MetricAlertRuleThresholdType
    thresholdValue: Float
    direction: MetricAlertRuleDirection
    severity: MetricAlertRuleSeverity
    confirmationMinutes: Int
    channelIds: [ID!]
    savedFilterId: ID
    enabled: Boolean
  }

  input DeleteMetricAlertRulesInput {
    project: ProjectReferenceInput!
    ruleIds: [ID!]!
  }

  type AddMetricAlertRuleResult {
    ok: AddMetricAlertRuleOk
    error: AddMetricAlertRuleError
  }

  type AddMetricAlertRuleOk {
    addedMetricAlertRule: MetricAlertRule!
    """
    The target that owns the new rule. Returned so urql's cache can invalidate
    Target.metricAlertRules after a successful create, mirroring how
    addAlert/addAlertChannel return updatedProject for the same reason.
    """
    updatedTarget: Target!
  }

  type AddMetricAlertRuleError implements Error {
    message: String!
  }

  type UpdateMetricAlertRuleResult {
    ok: UpdateMetricAlertRuleOk
    error: UpdateMetricAlertRuleError
  }

  type UpdateMetricAlertRuleOk {
    updatedMetricAlertRule: MetricAlertRule!
  }

  type UpdateMetricAlertRuleError implements Error {
    message: String!
  }

  type DeleteMetricAlertRulesResult {
    ok: DeleteMetricAlertRulesOk
    error: DeleteMetricAlertRulesError
  }

  type DeleteMetricAlertRulesOk {
    deletedMetricAlertRuleIds: [ID!]!
  }

  type DeleteMetricAlertRulesError implements Error {
    message: String!
  }
`;
