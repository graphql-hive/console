/**
 * Example request bodies Hive posts to a webhook alert channel. They mirror the code that builds
 * the real ones and must be updated with it: `SchemaChangeNotification` in
 * packages/services/workflows/src/webhooks/schema-change-notification.ts (its `changes` are
 * `HiveSchemaChangeModel` values from @hive/storage) and `buildWebhookPayload` in
 * packages/services/workflows/src/lib/metric-alert-notifier.ts.
 */
export type WebhookPayloadExample = {
  id: string;
  label: string;
  body: Record<string, unknown>;
};

const organization = {
  id: '6f0b5c1e-3d2a-4b7e-9c41-0a8d2e5f7b13',
  cleanId: 'acme',
  slug: 'acme',
  name: 'Acme',
};

const project = {
  id: 'b2d94a70-5e1c-4f38-8a6b-3c7e9d0f1a25',
  cleanId: 'my-api',
  slug: 'my-api',
  name: 'my-api',
};

const target = {
  id: '9e4c7a12-8b3f-4d65-a0c9-1f2e3d4b5a67',
  cleanId: 'production',
  slug: 'production',
  name: 'production',
};

const metricAlertFiring = {
  type: 'metric_alert',
  state: 'firing',
  alert: {
    name: 'High p99 latency',
    type: 'LATENCY',
    metric: 'P99',
    severity: 'CRITICAL',
  },
  currentValue: 742.5,
  previousValue: 418.2,
  changePercent: 77.54662840746055,
  threshold: {
    type: 'FIXED_VALUE',
    value: 500,
    direction: 'ABOVE',
  },
  target: { slug: 'production' },
  project: { slug: 'my-api' },
  organization: { slug: 'acme' },
  url: 'https://app.graphql-hive.com/acme/my-api/production/alerts/c8a1b2d3-4e5f-4a6b-9c7d-8e9f0a1b2c3d',
};

export const WEBHOOK_PAYLOAD_EXAMPLES: WebhookPayloadExample[] = [
  {
    id: 'schema-change',
    label: 'Schema change',
    body: {
      organization,
      project,
      target,
      schema: {
        id: '3a7d1f58-c2b4-4e09-b6a1-7d8e9f0a1b2c',
        valid: true,
        commit: '7a1f3c9',
      },
      changes: [
        {
          id: 'e04e44fc2522d7714dff42561ac39a71',
          type: 'FIELD_REMOVED',
          approvalMetadata: null,
          criticality: 'BREAKING',
          message: "Field 'legacyId' was removed from object type 'User'",
          meta: {
            typeName: 'User',
            removedFieldName: 'legacyId',
            isRemovedFieldDeprecated: false,
            typeType: 'object type',
          },
          path: 'User.legacyId',
          isSafeBasedOnUsage: false,
          reason:
            'Removing a field is a breaking change. It is preferable to deprecate the field before removing it. This applies to removed union fields as well, since removal breaks client operations that contain fragments that reference the removed type through direct (... on RemovedType) or indirect means such as __typename in the consumers.',
          usageStatistics: null,
          affectedAppDeployments: null,
          breakingChangeSchemaCoordinate: 'User.legacyId',
        },
        {
          id: '11c10084a2294709bced7fc129703ef1',
          type: 'ENUM_VALUE_ADDED',
          approvalMetadata: null,
          criticality: 'DANGEROUS',
          message: "Enum value 'AUDITOR' was added to enum 'Role'",
          meta: {
            enumName: 'Role',
            addedEnumValueName: 'AUDITOR',
            addedToNewType: false,
            addedDirectiveDescription: null,
          },
          path: 'Role.AUDITOR',
          isSafeBasedOnUsage: false,
          reason:
            'Adding an enum value may break existing clients that were not programming defensively against an added case when querying an enum.',
          usageStatistics: null,
          affectedAppDeployments: null,
          breakingChangeSchemaCoordinate: 'Role.AUDITOR',
        },
        {
          id: 'c0296072ab04fb6527c38f330d4194f8',
          type: 'FIELD_ADDED',
          approvalMetadata: null,
          criticality: 'NON_BREAKING',
          message: "Field 'displayName' was added to object type 'User'",
          meta: {
            typeName: 'User',
            addedFieldName: 'displayName',
            typeType: 'object type',
            addedFieldReturnType: 'String',
          },
          path: 'User.displayName',
          isSafeBasedOnUsage: false,
          reason: null,
          usageStatistics: null,
          affectedAppDeployments: null,
          breakingChangeSchemaCoordinate: null,
        },
      ],
      errors: [],
    },
  },
  {
    id: 'schema-change-composition-errors',
    label: 'Schema change (composition errors)',
    body: {
      organization,
      project,
      target,
      schema: {
        id: 'd5e6f7a8-9b0c-4d1e-8f2a-3b4c5d6e7f80',
        valid: false,
        commit: 'e42b6d0',
      },
      changes: [],
      errors: [
        {
          message:
            'Field "User.id" has incompatible types across subgraphs: it has type "ID!" in subgraph "users" but type "String!" in subgraph "reviews"',
          source: 'composition',
        },
      ],
    },
  },
  {
    id: 'metric-alert-firing',
    label: 'Metric alert (firing)',
    body: metricAlertFiring,
  },
  {
    id: 'metric-alert-resolved',
    label: 'Metric alert (resolved)',
    body: {
      ...metricAlertFiring,
      state: 'resolved',
      currentValue: 386.4,
      previousValue: 742.5,
      changePercent: -47.959595959595966,
    },
  },
];
