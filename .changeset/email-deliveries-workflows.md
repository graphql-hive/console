---
'hive': minor
---

Organization emails are now recorded in ClickHouse `outbound_deliveries` as `EMAIL` deliveries: invitations, ownership transfers, audit log exports, and usage rate limit warning and exceeded notices. Each attempt stores the recipient address, the mail provider's answer (HTTP status or SMTP reply code and text), the message id (Postmark's, or the Message-ID header for SMTP), the subject, the job and request ids, and the attempt number with the job's retry budget. Bodies, links and codes are never stored. Recipient addresses stay for the table's 75 day retention.

The member invitations table shows whether the mail provider accepted each invitation email, with the attempt count while Hive retries a refused one.

Postmark requests now time out after 15 seconds, so a hung connection fails the attempt and the job retries instead of blocking the worker. The `mock` email provider refuses recipients whose local part ends in `+bounce`, for testing.
