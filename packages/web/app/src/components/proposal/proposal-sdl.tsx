import { FragmentType, graphql, useFragment } from '@/gql';
import { parse, print } from 'graphql';

const ProposalOverview_ReviewsFragment = graphql(/** GraphQL */`
  fragment ProposalOverview_ReviewsFragment on SchemaProposalReviewConnection {
    pageInfo {
      startCursor
    }
    edges {
      cursor
      node {
        id
        schemaProposalVersion {
          id
        }
        stageTransition
        lineNumber
        lineText
        schemaCoordinate
        comments {
          edges {
            cursor
            node {
              id
              user {
                id
                email
                displayName
                fullName
              }
              body
              updatedAt
            }
          }
          pageInfo {
            startCursor
          }
        }
        schemaProposalVersion {
          id
        }
      }
    }
  }
`);

export function ProposalSDL(props: {
  sdl: string;
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
}) {
  const document = parse(props.sdl);
  console.log(print(document));
  const connection = useFragment(ProposalOverview_ReviewsFragment, props.reviews);
  // for (const edge of connection.edges) {
  //   edge.node.
  // }
  return <div/>;
}
