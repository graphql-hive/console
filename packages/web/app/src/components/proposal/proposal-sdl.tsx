import { buildSchema } from 'graphql';
import { FragmentType, graphql, useFragment } from '@/gql';
import type { Change } from '@graphql-inspector/core';
import { printSchemaDiff } from './print-diff/print-diff';

const ProposalOverview_ReviewsFragment = graphql(/** GraphQL */ `
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
          serviceName
          # schemaSDL
        }
        stageTransition
        lineNumber
        lineText
        schemaCoordinate
        ...ProposalOverview_ReviewCommentsFragment
      }
    }
  }
`);

// @todo should this be done on proposal update AND then the proposal can reference the check????
//  So it can get the changes

// const ProposalOverview_CheckSchema = graphql(/** GraphQL */`
//   mutation ProposalOverview_CheckSchema($target: TargetReferenceInput!, $sdl: String!, $service: ID) {
//     schemaCheck(input: {
//       target: $target
//       sdl: $sdl
//       service: $service
//     }) {
//       __typename
//       ...on SchemaCheckSuccess {

//       }
//       ...on SchemaCheckError {
//         changes {
//           edges {
//             node {
//               path
//             }
//           }
//         }
//       }
//     }
//   }
// `);

// type ReviewNode = NonNullable<ProposalOverview_ReviewsFragmentFragment['edges']>[number]['node'];

export function ProposalSDL(props: {
  baseSchemaSDL: string;
  changes: Change[];
  serviceName?: string;
  latestProposalVersionId: string;
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment> | null;
}) {
  /**
   * Reviews can change position because the coordinate changes... placing them out of order from their original line numbers.
   * Because of this, we have to fetch every single page of comments...
   * But because generally they are in order, we can take our time doing this. So fetch in small batches.
   *
   * Odds are there will never be so many reviews/comments that this is even a problem.
   */
  const _reviewsConnection = useFragment(ProposalOverview_ReviewsFragment, props.reviews);

  try {
    // @todo use props.baseSchemaSDL
    const baseSchemaSDL = /* GraphQL */ `
      """
      This is old
      """
      directive @old on FIELD

      directive @foo on OBJECT

      "Doesn't change"
      type Query {
        okay: Boolean @deprecated
        dokay: Boolean
      }
    `;

    const patchedSchemaSDL = /* GraphQL */ `
      """
      Custom scalar that can represent any valid JSON
      """
      scalar JSON

      directive @foo repeatable on OBJECT | FIELD

      """
      Enhances fields with meta data
      """
      directive @meta(
        "The metadata key"
        name: String!
        "The value of the metadata"
        content: String!
      ) on FIELD

      "Doesn't change"
      type Query {
        okay: Boolean @deprecated(reason: "Use 'ok' instead.")
        ok: Boolean @meta(name: "team", content: "hive")

        """
        This is a new description on a field
        """
        dokay(foo: String = "What"): Boolean!
      }

      "Yups"
      enum Status {
        OKAY
        """
        Hi
        """
        SMOKAY
      }

      """
      Crusty flaky delicious goodness.
      """
      type Pie {
        name: String!
        flavor: String!
        slices: Int
      }

      """
      Delicious baked flour based product
      """
      type Cake {
        name: String!
        flavor: String!
        tiers: Int!
      }

      input FooInput {
        """
        Hi
        """
        asdf: String @foo
      }

      union Dessert = Pie | Cake
    `; // APPLY PATCH

    return printSchemaDiff(
      buildSchema(baseSchemaSDL, { assumeValid: true, assumeValidSDL: true }),
      buildSchema(patchedSchemaSDL, { assumeValid: true, assumeValidSDL: true }),
    );

    // // @note assume reviews are specific to the current service...
    // const globalReviews: ReviewNode[] = [];
    // const reviewsByLine = new Map<number, ReviewNode & { isStale: boolean }>();
    // const serviceReviews =
    //   reviewsConnection?.edges?.filter(edge => {
    //     const { schemaProposalVersion } = edge.node;
    //     return schemaProposalVersion?.serviceName === props.serviceName;
    //   }) ?? [];

    // for (const edge of serviceReviews) {
    //   const { lineNumber, schemaCoordinate, schemaProposalVersion } = edge.node;
    //   const coordinateLine = !!schemaCoordinate && coordinateToLineMap.get(schemaCoordinate);
    //   const isStale =
    //     !coordinateLine && schemaProposalVersion?.id !== props.latestProposalVersionId;
    //   const line = coordinateLine || lineNumber;
    //   if (line) {
    //     reviewsByLine.set(line, { ...edge.node, isStale });
    //   } else {
    //     globalReviews.push(edge.node);
    //   }
    // }

    // const baseSchemaSdlLines = baseSchemaSDL.split('\n');
    // let diffLineNumber = 0;
    // return (
    //   <>
    //     <ChangeDocument>
    //       {patchedSchemaSDL.split('\n').flatMap((txt, index) => {
    //         const lineNumber = index + 1;
    //         const diffLineMatch = txt === baseSchemaSdlLines[diffLineNumber];
    //         const elements = [
    //           <ChangeRow
    //             key={`change-${lineNumber}`}
    //             lineNumber={lineNumber}
    //             diffLineNumber={diffLineNumber + 1}
    //           >
    //             {txt}
    //           </ChangeRow>,
    //         ];
    //         if (diffLineMatch) {
    //           diffLineNumber = diffLineNumber + 1;
    //         }

    //         const review = reviewsByLine.get(lineNumber);
    //         if (review) {
    //           if (review.isStale) {
    //             elements.push(
    //               <tr key={`stale-${lineNumber}`}>
    //                 <td colSpan={2} />
    //                 <td className="p-2">
    //                   <div className="p-2 font-sans text-xs" aria-label="warning">
    //                     This review references an outdated version of the proposal.
    //                   </div>
    //                   {!!review.lineText && (
    //                     <ChangeDocument className="bg-secondary border-[1px] border-gray-800 text-white">
    //                       <ChangeRow
    //                         lineNumber={lineNumber}
    //                         diffLineNumber={lineNumber}
    //                         aria-label="preview"
    //                       >
    //                         {review.lineText}
    //                       </ChangeRow>
    //                     </ChangeDocument>
    //                   )}
    //                 </td>
    //               </tr>,
    //             );
    //           }
    //           elements.push(
    //             <tr key={`change-review-${lineNumber}`} className="font-sans">
    //               <td colSpan={2} />
    //               <td className="p-2">
    //                 <ReviewComments lineNumber={lineNumber} review={review} />
    //               </td>
    //             </tr>,
    //           );
    //         }
    //         return elements;
    //       })}
    //     </ChangeDocument>
    //     {globalReviews.map(r => {
    //       return <div key={`global-review-${r.id}`}>{r.id}</div>;
    //     })}
    //   </>
    // );
    // console.log(printJsx(document));
  } catch (e: unknown) {
    return (
      <>
        <div className="text-lg">Invalid SDL</div>
        <div>{e instanceof Error ? e.message : String(e)}</div>
      </>
    );
  }
}
