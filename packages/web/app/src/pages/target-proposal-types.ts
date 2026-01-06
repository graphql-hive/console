import type { GraphQLSchema } from 'graphql';
import type { CompositionErrorsSection_SchemaErrorConnection } from '@/components/target/history/errors-and-changes';
import type { ProposalOverview_ChangeFragment } from '@/components/target/proposals';
import { FragmentType } from '@/gql';
import type { Change } from '@graphql-inspector/core';

export type ServiceProposalDetails = {
  compositionErrors?: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
  beforeSchema: GraphQLSchema | null;
  afterSchema: GraphQLSchema | null;
  buildError: Error | null;
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
