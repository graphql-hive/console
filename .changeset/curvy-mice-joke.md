---
'hive-apollo-router-plugin': minor
---

Add support for providing a target for usage reporting with organization access tokens.

This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")
or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").

```yaml
# ... other apollo-router configuration
plugins:
  hive.usage:
    enabled: true
    registry_token: "ORGANIZATION_ACCESS_TOKEN"
    target: "my-org/my-project/my-target"
```