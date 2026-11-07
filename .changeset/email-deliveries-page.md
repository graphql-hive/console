---
'hive': minor
---

Organization settings gain an "Email Deliveries" section, for members who can manage invitations (`member:modify`): the emails Hive sent for the organization in the last 72 hours (invitations, ownership transfers, audit log exports and usage notices), how many the mail provider accepted or refused, when it last did either, a chart of attempts and failures over time, and a log of each attempt with the recipient, the provider's answer, the duration, the retry count and the recorded details (subject, message id, request and job ids). Bodies, links and codes are never shown because they are never stored.

In GraphQL, `Organization.emailDeliveryStats(period)`, `emailDeliveryHealth` and `emailDeliveryLog(period, limit)` expose the same data, shaped like the delivery fields of an alert channel, and `Organization.viewerCanSeeEmailDeliveries` says whether the viewer may read them.
