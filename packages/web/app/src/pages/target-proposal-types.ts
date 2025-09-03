import type { GraphQLSchema } from 'graphql';
import { ProposalOverview_ChangeFragment } from '@/components/target/proposals';
import { FragmentType } from '@/gql';
import type { Change } from '@graphql-inspector/core';

export type ServiceProposalDetails = {
  beforeSchema: GraphQLSchema | null;
  afterSchema: GraphQLSchema | null;
  allChanges: Change<any>[];
  // Required because the component ChangesBlock uses this fragment.
  rawChanges: FragmentType<typeof ProposalOverview_ChangeFragment>[];
  ignoredChanges: Array<{
    change: Change;
    error: Error;
  }>;
  conflictingChanges: Array<{
    change: Change;
    error: Error;
  }>;
  serviceName: string;
};
