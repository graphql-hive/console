---
'hive': patch
---

Add `EMAIL_PROVIDER_SMTP_IGNORE_TLS` environment variable for the `smtp` email provider.

Set it to `1` to never use STARTTLS, even when the SMTP server advertises support for it. This
allows sending emails through servers without working TLS support. The variable is opt-in and
defaults to `0`, so existing deployments keep their current behaviour.
