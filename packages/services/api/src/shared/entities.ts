import type { DocumentNode } from 'graphql';
import type {
  SchemaError,
  AlertChannelType,
  AlertType,
  AuthProvider,
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from '../__generated__/types';
import { parse } from 'graphql';

export interface Schema {
  id: string;
  author: string;
  source: string;
  date: string;
  commit: string;
  target: string;
  url?: string | null;
  service?: string | null;
  metadata?: Record<string, any> | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SchemaVersion {
  id: string;
  valid: boolean;
  date: number;
  commit: string;
  base_schema: string | null;
}

export interface SchemaObject {
  document: DocumentNode;
  source: string;
  url?: string | null;
  raw: string;
}

export interface PersistedOperation {
  id: string;
  operationHash: string;
  name: string;
  kind: string;
  project: string;
  content: string;
  date: string;
}

export const emptySource = '*';

export function createSchemaObject(schema: Schema): SchemaObject {
  return {
    document: parse(schema.source),
    raw: schema.source,
    source: schema.service ?? emptySource,
    url: schema.url ?? null,
  };
}

export enum ProjectType {
  FEDERATION = 'FEDERATION',
  STITCHING = 'STITCHING',
  SINGLE = 'SINGLE',
  CUSTOM = 'CUSTOM',
}

export enum OrganizationType {
  PERSONAL = 'PERSONAL',
  REGULAR = 'REGULAR',
}

export interface Organization {
  id: string;
  cleanId: string;
  name: string;
  type: OrganizationType;
  inviteCode: string;
  billingPlan: string;
  monthlyRateLimit: {
    retentionInDays: number;
    operations: number;
    schemaPush: number;
  };
}

export interface OrganizationBilling {
  organizationId: string;
  externalBillingReference: string;
  billingEmailAddress?: string | null;
}

export interface Project {
  id: string;
  cleanId: string;
  orgId: string;
  name: string;
  type: ProjectType;
  buildUrl?: string | null;
  validationUrl?: string | null;
  gitRepository?: string | null;
}

export interface Target {
  id: string;
  cleanId: string;
  projectId: string;
  orgId: string;
  name: string;
}

export interface Token {
  token: string;
  tokenAlias: string;
  name: string;
  target: string;
  project: string;
  organization: string;
  date: string;
  lastUsedAt: string;
  scopes: readonly string[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  provider: AuthProvider;
  externalAuthUserId: string;
}

export interface Member {
  id: string;
  user: User;
  organization: string;
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>;
}

export interface TargetSettings {
  validation: {
    enabled: boolean;
    period: number;
    percentage: number;
    targets: readonly string[];
  };
}

export interface Orchestrator {
  ensureConfig(config: any): void | never;
  validate(schemas: SchemaObject[], config?: any): Promise<SchemaError[]>;
  build(schemas: SchemaObject[], config?: any): Promise<SchemaObject>;
  supergraph(schemas: SchemaObject[], config?: any): Promise<string | null>;
}

export interface ActivityObject {
  id: string;
  type: string;
  meta: any;
  createdAt: Date;
  target?: Target;
  project?: Project;
  organization: Organization;
  user?: User;
}

export interface AlertChannel {
  id: string;
  projectId: string;
  type: AlertChannelType;
  name: string;
  createdAt: string;
  slackChannel: string | null;
  webhookEndpoint: string | null;
}

export interface Alert {
  id: string;
  type: AlertType;
  channelId: string;
  organizationId: string;
  projectId: string;
  targetId: string;
  createdAt: string;
}

export interface AdminOrganizationStats {
  organization: Organization;
  versions: number;
  users: number;
  projects: number;
  targets: number;
  persistedOperations: number;
  daysLimit?: number | null;
}
