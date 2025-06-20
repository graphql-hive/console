import { SchemaProposalStage } from '@/gql/graphql';

export function stageToColor(stage: SchemaProposalStage | string) {
  switch (stage) {
    case SchemaProposalStage.Closed:
      return 'red' as const;
    case SchemaProposalStage.Draft:
      return 'gray' as const;
    case SchemaProposalStage.Open:
      return 'orange' as const;
    default:
      return 'green' as const;
  }
}

export function userText(user?: {
  email: string;
  displayName?: string | null;
  fullName?: string | null;
} | null) {
  return user?.displayName || user?.fullName || user?.email || 'Unknown';
}
