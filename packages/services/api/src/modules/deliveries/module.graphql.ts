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
  }

  """
  One attempt to deliver a notification.
  """
  type Delivery {
    timestamp: DateTime!
    event: DeliveryEvent!
    """
    Where the attempt went: the alert channel id.
    """
    destination: String!
    ok: Boolean!
    """
    HTTP status of the response; null when there was no response.
    """
    statusCode: Int
    """
    One line describing the outcome: the reason phrase, the Slack API result code,
    or "<error code>: <message>" when nothing answered.
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
    version id.
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
    lastStatusCode: Int
    lastStatusText: String
    """
    First failure after the last success, at the earliest as far back as retention reaches.
    Null unless FAILING.
    """
    failingSince: DateTime
  }
`;
