---
'hive': patch
---

Metric alert notifications now link back to the alert rule in Hive Console. Slack and Microsoft Teams messages gain a "View alert in Hive" link, and the webhook payload gains a `url` field pointing at the same page.

Self-hosted deployments need to set `WEB_APP_URL` on the workflows service to enable it:

```env
WEB_APP_URL=https://your-hive-console-url
```

The variable is optional. When it is unset, notifications are sent exactly as before, without the link, and the webhook payload's `url` is `null`.
