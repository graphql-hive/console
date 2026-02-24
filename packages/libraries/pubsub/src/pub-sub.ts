import type { PubSub } from 'graphql-yoga';

export type HivePubSub = PubSub<{
  oidcIntegrationLogs: [oidcIntegrationId: string, payload: { timestamp: string; message: string }];
  schemaProposalComposition: [
    proposalId: string,
    payload: { timestamp: string; status: 'success' | 'fail' | 'error' },
  ];
}>;
