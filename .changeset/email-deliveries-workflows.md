---
'hive': minor
---

Organization emails are now recorded in ClickHouse `outbound_deliveries` as `EMAIL` deliveries: invitations, ownership transfers, audit log exports, and usage rate limit warning and exceeded notices. Each attempt stores the recipient address, the mail provider's answer (HTTP status or SMTP reply code, and its text), the message id when the provider reports one (Postmark's `MessageID`, or the Message-ID header for SMTP), the subject, the job id, the request id when a request scheduled the job, and the attempt number with the job's retry budget. Bodies, links and codes are never stored. Recipient addresses are kept for the table's 75-day retention. Recording needs the workflows service's ClickHouse connection (`CLICKHOUSE=1`, as for webhook deliveries); without it nothing is recorded and invitations show "Not sent yet".

The member invitations table gains an "Email status" column: whether the mail provider accepted each invitation email, with the attempt count while Hive retries a refused one. In GraphQL, `OrganizationInvitation.delivery` exposes that most recent attempt, and `DeliveryEvent` gains `ORGANIZATION_INVITATION`, `ORGANIZATION_OWNERSHIP_TRANSFER`, `AUDIT_LOG_EXPORT`, `USAGE_RATE_LIMIT_WARNING` and `USAGE_RATE_LIMIT_EXCEEDED`.

Postmark requests now time out after 15 seconds, so a hung connection fails the attempt and the job retries instead of blocking the worker. The `mock` email provider refuses recipients whose local part ends in `+bounce`, for testing.
