import { Injectable } from 'graphql-modules';

@Injectable()
export class AuditLogApiConfig {
  constructor(public readonly isEnabled: boolean) {}
}
