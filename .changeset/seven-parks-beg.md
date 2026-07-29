---
'hive': patch
---

Add Azure Workload Identity Federation support for OIDC SSO in self-hosted deployments. Enabled
organizations use the projected Azure token as a client assertion instead of an OIDC client secret.

For example, enable federation for an organization with:

```env
OIDC_WORKLOAD_FEDERATION_IDENTITY_PROVIDER=azure
AZURE_FEDERATED_TOKEN_FILE=/var/run/secrets/azure/tokens/azure-identity-token
OIDC_WORKLOAD_FEDERATION_ORGANIZATION_IDS=00000000-0000-4000-8000-000000000000
```

This will effectively override the client secret configured for that organization to use the OIDC provider.
