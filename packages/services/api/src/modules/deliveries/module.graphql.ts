import { gql } from 'graphql-modules';

export default gql`
  """
  Delivery attempts recorded for one destination in a period.
  """
  type DeliveryStats {
    """
    Delivery attempts in the period, successful or not.
    """
    totalDeliveries: SafeInt!
    """
    Attempts the destination did not accept.
    """
    totalFailures: SafeInt!
    """
    Delivery attempts per interval, successful or not.
    """
    deliveriesOverTime(
      """
      How fine of granularity to show
      """
      resolution: Int!
    ): [RequestsOverTime!]!
    """
    Attempts the destination did not accept, per interval.
    """
    failuresOverTime(
      """
      How fine of granularity to show
      """
      resolution: Int!
    ): [FailuresOverTime!]!
  }

  enum DeliveryEvent {
    SCHEMA_CHANGE
    METRIC_ALERT
    CHANNEL_CONFIRMATION
    ORGANIZATION_INVITATION
    ORGANIZATION_OWNERSHIP_TRANSFER
    AUDIT_LOG_EXPORT
    USAGE_RATE_LIMIT_WARNING
    USAGE_RATE_LIMIT_EXCEEDED
  }

  """
  One attempt to deliver a notification to an alert channel, or an email to a recipient.
  """
  type Delivery {
    timestamp: DateTime!
    event: DeliveryEvent!
    """
    Where the attempt went: the alert channel id, or the recipient email address.
    """
    destination: String!
    ok: Boolean!
    """
    What the destination answered with: the HTTP status for webhooks and Slack, the SMTP reply
    code for email; null when nothing answered.
    """
    statusCode: Int
    """
    One line describing the outcome: the reason phrase, the Slack API result code, the mail
    provider's refusal with its error code, or "Timed out" or "Unexpected error" when nothing
    usable answered. Never an exception's message.
    """
    statusText: String!
    durationMs: Int!
    """
    Retry attempt number (1 = first try).
    """
    attempt: Int!
    """
    The retry budget of the job that made this attempt.
    """
    maxAttempts: Int!
    """
    What Hive sent to identify the call, as a flat string map: the request headers
    (Hive-Request-ID, Hive-Event, Hive-Target-ID, Hive-Schema-ID, User-Agent, Idempotency-Key)
    for webhook channels, or the Slack message metadata (event_type, hive_request_id,
    hive_target_id, hive_schema_id, idempotency_key, user_agent). Hive-Schema-ID is the schema
    version id. For email: subject, job_id, hive_request_id, message_id (Postmark's id for the
    message, or the Message-ID header of the message sent over SMTP) and, per event, period, limit
    or current_usage; never the body or a link.
    """
    metadata: JSONObject!
  }

  enum DeliveryHealthStatus {
    """
    No attempt recorded, or every recorded attempt has expired.
    """
    UNKNOWN
    """
    Attempts were recorded and the ten most recent ones are not all failures.
    """
    HEALTHY
    """
    The ten most recent attempts all failed; failingSince is the start of the current streak.
    """
    FAILING
  }

  """
  Health of one destination, derived from its most recent recorded attempts.
  """
  type DeliveryHealth {
    status: DeliveryHealthStatus!
    lastSuccessAt: DateTime
    lastFailureAt: DateTime
    """
    What the destination answered with on the last failure: the HTTP status for webhooks and
    Slack, the SMTP reply code for email; null when nothing answered.
    """
    lastStatusCode: Int
    """
    The status text of the last failure, as Delivery.statusText describes it.
    """
    lastStatusText: String
    """
    First failure after the last success, at the earliest as far back as retention reaches.
    Null unless FAILING.
    """
    failingSince: DateTime
  }

  extend type OrganizationInvitation {
    """
    The most recent attempt to email this invitation; null before one is recorded or when the
    delivery history could not be read.
    """
    delivery: Delivery
  }

  extend type Organization {
    """
    Attempts to email the organization's members and invitees in the period: invitations,
    ownership transfers, audit log exports and usage rate limit notices. Requires member:modify.
    Null when the delivery history could not be read.
    """
    emailDeliveryStats(
      """
      The period for retrieving the statistics.
      """
      period: DateRangeInput!
    ): DeliveryStats
    """
    Health derived across every recipient: lastSuccessAt and lastFailureAt are meaningful, status
    is not. Requires member:modify. Null when the delivery history could not be read.
    """
    emailDeliveryHealth: DeliveryHealth
    """
    The most recent email attempts within the period, newest first. limit defaults to 50, at most
    200. Requires member:modify. Null when the delivery history could not be read.
    """
    emailDeliveryLog(period: DateRangeInput!, limit: Int): [Delivery!]
    viewerCanSeeEmailDeliveries: Boolean!
  }
`;
