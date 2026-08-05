import { Injectable } from 'graphql-modules';

@Injectable()
export class OIDCIntegrationConfig {
  constructor(
    /** Whether OIDC integrations are enabled. */
    public readonly isEnabled: boolean,
    /** Whether SCIM provisioning is globally enabled. */
    public readonly isSCIMEnabled: boolean,
  ) {}
}
