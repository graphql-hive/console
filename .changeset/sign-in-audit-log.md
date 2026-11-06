---
'hive': minor
---

Record `USER_SIGNED_IN` and `USER_SIGN_IN_FAILED` audit log events for email/password, GitHub, Google, Okta and OIDC sign ins, including the sign in method.
Failed attempts additionally include the attempted email address and the failure reason (`UNKNOWN_USER`, `INVALID_CREDENTIALS`, `SSO_REQUIRED`, `USER_NOT_PROVISIONED`, `USER_DEACTIVATED`, `IDENTITY_PROVIDER_ERROR` or `NOT_ALLOWED`).

OIDC sign ins are recorded for the organization linked to the OIDC integration. All other sign ins are recorded for the organization that verified the domain of the email address; successful sign ins only if the email address is verified.
