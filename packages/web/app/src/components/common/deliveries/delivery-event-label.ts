import { DeliveryEvent } from '@/gql/graphql';

export const DELIVERY_EVENT_LABEL: Record<DeliveryEvent, string> = {
  [DeliveryEvent.SchemaChange]: 'Schema change',
  [DeliveryEvent.MetricAlert]: 'Metric alert',
  [DeliveryEvent.ChannelConfirmation]: 'Channel confirmation',
  [DeliveryEvent.OrganizationInvitation]: 'Invitation',
  [DeliveryEvent.OrganizationOwnershipTransfer]: 'Ownership transfer',
  [DeliveryEvent.AuditLogExport]: 'Audit log export',
  [DeliveryEvent.UsageRateLimitWarning]: 'Usage limit warning',
  [DeliveryEvent.UsageRateLimitExceeded]: 'Usage limit exceeded',
};
