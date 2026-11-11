import { Injectable } from 'graphql-modules';

@Injectable()
export class AuditLogApiConfig {
  constructor(
    /** Whether the audit log API is enabled (`FEATURE_FLAGS_AUDIT_LOG_API_ENABLED`). */
    public readonly isEnabled: boolean,
  ) {}
}
