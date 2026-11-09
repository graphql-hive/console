---
'hive': minor
---

Record `USER_SIGNED_IN` and `USER_SIGN_IN_FAILED` audit log events for email/password, GitHub, Google, Okta and OIDC sign ins, including the sign in method.
Failed attempts additionally include the attempted email address and the failure reason (`UNKNOWN_USER`, `INVALID_CREDENTIALS`, `SSO_REQUIRED`, `USER_NOT_PROVISIONED`, `USER_DEACTIVATED`, `IDENTITY_PROVIDER_ERROR` or `NOT_ALLOWED`).

OIDC sign ins are recorded for the organization linked to the OIDC integration. All other sign ins are recorded for the organization that verified the domain of the email address. Successful sign ins include the email address and whether it is verified (`emailVerified`); sign ins with an unverified email address are recorded without an actor, as they can not be attributed to the owner of the email address.
