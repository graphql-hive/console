import { AuditLogType } from './providers/audit-logs-types';

export type AuditLogMapper = AuditLogType;
export type AuditLogIdRecordMapper = {
  organizationId: string;
  userEmail: string;
  userId: string;
};
