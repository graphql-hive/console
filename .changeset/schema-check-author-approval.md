---
'hive': minor
---

The author of a change can no longer approve their own failing schema check. A check is treated as
authored by a user when the email of the commit author sent with the check matches the email of the
user's account; checks without a commit author email are unaffected, and so are approvals made with
an access token (for example `schema:check --forceSafe`).

On the schema check page, users who cannot approve a failed check now see a disabled Approve button
with an explanation instead of no button.
