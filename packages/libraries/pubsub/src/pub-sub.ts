import type { PubSub } from 'graphql-yoga';

export type HivePubSub = PubSub<{
  oidcIntegrationLogs: [oidcIntegrationId: string, payload: { timestamp: string; message: string }];
  schemaProposalComposition: [
    proposalId: string,
    payload: { timestamp: string; status: 'SUCCESS' | 'ERROR'; reason?: string | null },
  ];
  /** Published by the workflows service when it finished building a schema explorer snapshot. */
  schemaExplorerSnapshot: [
    schemaVersionId: string,
    payload: { status: 'READY' | 'EMPTY' | 'ERROR'; reason?: string | null },
  ];
}>;
