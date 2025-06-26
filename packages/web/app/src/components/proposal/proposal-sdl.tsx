import { buildSchema, GraphQLSchema, Source } from 'graphql';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProposalOverview_ReviewsFragmentFragment } from '@/gql/graphql';
import { ChangeDocument, ChangeRow } from './change';
import { collectCoordinateLocations } from './collect-coordinate-locations';
import { ReviewComments } from './Review';

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
          schemaSDL
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

type ReviewNode = NonNullable<ProposalOverview_ReviewsFragmentFragment['edges']>[number]['node'];

export function ProposalSDL(props: {
  diffSdl: string;
  sdl: string;
  serviceName?: string;
  latestProposalVersionId: string;
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment> | null;
}) {
  try {
    void diff(
    buildSchema(props.diffSdl, { assumeValid: true, assumeValidSDL: true }),
    buildSchema(props.sdl, { assumeValid: true, assumeValidSDL: true }),
    ).then((changes) => {
      console.log('DIFF WORKED', changes);
    });
  } catch (e) {
    console.error(`Handled error ${e}`);
  }

  /**
   * Reviews can change position because the coordinate changes... placing them out of order from their original line numbers.
   * Because of this, we have to fetch every single page of comments...
   * But because generally they are in order, we can take our time doing this. So fetch in small batches.
   *
   * Odds are there will never be so many reviews/comments that this is even a problem.
   */
  const reviewsConnection = useFragment(ProposalOverview_ReviewsFragment, props.reviews);

  try {
    let diffSchema: GraphQLSchema | undefined;
    try { 
      diffSchema = buildSchema(props.diffSdl, { assumeValid: true, assumeValidSDL: true });
    } catch (e) {
      console.error('Diff schema is invalid.')
    }
    
    const schema = buildSchema(props.sdl, { assumeValid: true, assumeValidSDL: true });
    const coordinateToLineMap = collectCoordinateLocations(
      schema,
      new Source(props.sdl),
    );

    if (diffSchema) {
      // @todo run schema check and get diff from that API.... That way usage can be checked easily.
      void diff(diffSchema, schema, undefined)
    }

    // @note assume reviews are specific to the current service...
    const globalReviews: ReviewNode[] = [];
    const reviewsByLine = new Map<number, ReviewNode & { isStale: boolean }>();
    const serviceReviews = reviewsConnection?.edges
      ?.filter(edge => {
        const { schemaProposalVersion } = edge.node;
        return schemaProposalVersion?.serviceName === props.serviceName;
      }) ?? [];

    for (const edge of serviceReviews) {
      const { lineNumber, schemaCoordinate, schemaProposalVersion } = edge.node;
      const coordinateLine = !!schemaCoordinate && coordinateToLineMap.get(schemaCoordinate);
      const isStale =
        !coordinateLine && schemaProposalVersion?.id !== props.latestProposalVersionId;
      const line = coordinateLine || lineNumber;
      if (line) {
        reviewsByLine.set(line, { ...edge.node, isStale });
      } else {
        globalReviews.push(edge.node);
      }
    }

    const diffSdlLines = props.diffSdl.split('\n');
    let diffLineNumber = 0;
    return (
      <>
        <ChangeDocument>
          {props.sdl.split('\n').flatMap((txt, index) => {
            const lineNumber = index + 1;
            const diffLineMatch = txt === diffSdlLines[diffLineNumber];
            const elements = [<ChangeRow key={`change-${lineNumber}`} lineNumber={lineNumber} diffLineNumber={diffLineNumber+1}>{txt}</ChangeRow>];
            if (diffLineMatch) {
              diffLineNumber = diffLineNumber + 1;
            }
            
            const review = reviewsByLine.get(lineNumber)
            if (review) {
              if (review.isStale) {
                elements.push((
                  <tr key={`stale-${lineNumber}`}>
                    <td colSpan={2}/>
                    <td className='p-2'>
                      <div className="text-xs p-2 font-sans" aria-label="warning">This review references an outdated version of the proposal.</div>
                      {!!review.lineText && (
                        <ChangeDocument className='bg-secondary text-white border-gray-800 border-[1px]'>
                          <ChangeRow lineNumber={lineNumber} diffLineNumber={lineNumber} aria-label="preview">
                            {review.lineText}
                          </ChangeRow>
                        </ChangeDocument>
                      )}
                    </td>
                  </tr>
                ))
              }
              elements.push(
                <tr key={`change-review-${lineNumber}`} className='font-sans'>
                  <td colSpan={2}/>
                  <td className='p-2'>
                    <ReviewComments lineNumber={lineNumber} review={review}/>
                  </td>
                </tr>
              );
            }
            return elements;
          })}
        </ChangeDocument>
        {globalReviews.map(r => {
          return (
            <div key={`global-review-${r.id}`}>
              {r.id}
            </div>
          )
        })}
      </>
    );
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
