---
'hive': minor
---

Opening a deep link into an organization that uses SSO now resolves the organization automatically:
the sign-in page's "Login with SSO" button names the organization and goes straight to its identity
provider, and `/auth/sso` prefills the slug from `redirectToPath` or an explicit `slug` parameter.
