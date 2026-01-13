import { parse, print } from 'graphql';
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

export function userText(
  user?: {
    email: string;
    displayName?: string | null;
    fullName?: string | null;
  } | null,
) {
  return user?.displayName || user?.fullName || user?.email || 'Unknown';
}

export function schemaTitle(
  schema:
    | {
        __typename: 'CompositeSchema';
        id: string;
        source: string;
        service?: string | null;
        url?: string | null;
      }
    | {
        __typename: 'SingleSchema';
        id: string;
        source: string;
      },
): string {
  if (schema.__typename === 'CompositeSchema') {
    return schema.service ?? schema.url ?? schema.id;
  }
  return '';
}

export function prettier(source: string) {
  try {
    return print(parse(source));
  } catch (e) {
    console.warn(e);
    return source;
  }
}
