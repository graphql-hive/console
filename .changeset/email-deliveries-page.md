---
'hive': minor
---

Organization settings gain an "Email Deliveries" section: the emails Hive sent for the organization in the last 72 hours, how many the mail provider accepted or refused, when it last did either, a chart of attempts and failures over time, and a log of each attempt with the recipient, the provider's answer, the duration, the retry count and the recorded details (subject, message id, request and job ids). Each member sees the kinds of email of the features they may manage: invitations with `member:modify`, audit log exports with `auditLog:export`, usage rate limit notices with `billing:describe`, and ownership transfers as the organization owner. When that leaves a kind out, the section names the kinds it shows. Bodies, links and codes are never shown because they are never stored.

In GraphQL, `Organization.emailDeliveryStats(period)`, `emailDeliveryHealth` and `emailDeliveryLog(period, limit)` expose the same data, limited the same way and shaped like the delivery fields of an alert channel, `Organization.viewerCanSeeEmailDeliveries` says whether the viewer may see at least one kind, and `Organization.viewerEmailDeliveryVisibility` lists the kinds they may see and whether any kind is kept from them.
