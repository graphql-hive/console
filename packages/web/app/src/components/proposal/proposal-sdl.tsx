import { FragmentType, graphql, useFragment } from '@/gql';
import type { Change } from '@graphql-inspector/core'
import type { MonacoDiffEditor as OriginalMonacoDiffEditor } from '@monaco-editor/react';
import { useRef } from 'react';
import { printSchemaDiff } from './print-diff/printDiff';
import { buildSchema } from 'graphql';

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
    // @todo props.baseSchemaSDL
    const baseSchemaSDL = /* GraphQL */`
      type Query {
        okay: Boolean
        dokay: Boolean
      }
    `;
    // const baseSchema = buildSchema(baseSchemaSDL, { assumeValid: true, assumeValidSDL: true });

    const patchedSchemaSDL = /* GraphQL */`
      type Query {
        ok: Boolean
        dokay: Boolean!
      }
    `;// APPLY PATCH

    return printSchemaDiff(
      buildSchema(baseSchemaSDL, { assumeValid: true, assumeValidSDL: true }),
      buildSchema(patchedSchemaSDL, { assumeValid: true, assumeValidSDL: true }),
    );

    // const editorRef = useRef<OriginalMonacoDiffEditor | null>(null);

    // return (
    //   <MonacoDiffEditor
    //     width="100%"
    //     height="70vh"
    //     language="graphql"
    //     theme="vs-dark"
    //     loading={<Spinner />}
    //     original={baseSchemaSDL ?? undefined}
    //     modified={patchedSchemaSDL ?? undefined}
    //     options={{
    //       renderSideBySide: false,
    //       originalEditable: false,
    //       renderLineHighlightOnlyWhenFocus: true,
    //       readOnly: true,
    //       diffAlgorithm: 'advanced',
    //       lineNumbers: 'on',
    //       contextmenu: false,
    //     }}
    //     onMount={(editor, _monaco) => {
    //       editorRef.current = editor;
    //       editor.onDidUpdateDiff(() => {
    //         // const coordinateToLineMap = collectCoordinateLocations(baseSchema, new Source(baseSchemaSDL));
    //         const originalLines = editor.getOriginalEditor().getContainerDomNode().getElementsByClassName('view-line');
    //         console.log(
    //           'original editor',
    //           Array.from(originalLines).map(e => e.textContent).join('\n'),
    //         );

    //         const modifiedLines = editor.getModifiedEditor().getContainerDomNode().getElementsByClassName('view-line');
    //         console.log(
    //           'modified',
    //           Array.from(modifiedLines).map(e => e.textContent).join('\n'),
    //         );
    //       })
    //     }}
    //   />
    // )

    

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
