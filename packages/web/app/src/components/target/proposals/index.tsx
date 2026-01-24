import { Fragment, useMemo } from 'react';
import { GraphQLSchema } from 'graphql';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DetachedAnnotations, ReviewComments } from './Review';
import { AnnotatedProvider } from './schema-diff/components';
import { SchemaDiff } from './schema-diff/core';

/**
 * Fragment containing a list of reviews. Each review is tied to a coordinate
 * and may contain one or more comments. This should be fetched in its entirety,
 * but this can be done serially because there should not be so many reviews within
 * a single screen's height that it matters.
 * */
export const Proposal_ReviewsFragment = graphql(/** GraphQL */ `
  fragment Proposal_ReviewsFragment on SchemaProposalReviewConnection {
    pageInfo {
      startCursor
    }
    edges {
      cursor
      node {
        id
        stageTransition
        lineText
        schemaCoordinate
        serviceName
        ...ProposalOverview_ReviewCommentsFragment
      }
    }
  }
`);

/** Move to utils? */
export const Proposal_ChangeFragment = graphql(/* GraphQL */ `
  fragment Proposal_ChangeFragment on SchemaChange {
    message(withSafeBasedOnUsageNote: false)
    path
    severityLevel
    meta {
      ... on FieldArgumentDescriptionChanged {
        argumentName
        fieldName
        newDescription
        typeName
      }
      ... on FieldArgumentTypeChanged {
        argumentName
        fieldName
        isSafeArgumentTypeChange
        newArgumentType
        typeName
      }
      ... on DirectiveRemoved {
        removedDirectiveName
      }
      ... on DirectiveAdded {
        addedDirectiveDescription
        addedDirectiveLocations
        addedDirectiveName
        addedDirectiveRepeatable
      }
      ... on DirectiveDescriptionChanged {
        directiveName
        newDirectiveDescription
      }
      ... on DirectiveLocationAdded {
        addedDirectiveLocation
        directiveName
      }
      ... on DirectiveLocationRemoved {
        directiveName
        removedDirectiveLocation
      }
      ... on DirectiveArgumentAdded {
        addedDirectiveArgumentDescription
        addedDirectiveArgumentName
        addedDirectiveArgumentType
        addedDirectiveArgumentTypeIsNonNull
        addedDirectiveDefaultValue
        addedToNewDirective
        directiveName
      }
      ... on DirectiveArgumentRemoved {
        directiveName
        removedDirectiveArgumentName
      }
      ... on DirectiveArgumentDescriptionChanged {
        directiveArgumentName
        directiveName
        newDirectiveArgumentDescription
      }
      ... on DirectiveArgumentDefaultValueChanged {
        directiveArgumentName
        directiveName
        newDirectiveArgumentDefaultValue
      }
      ... on DirectiveArgumentTypeChanged {
        directiveArgumentName
        directiveName
        newDirectiveArgumentType
      }
      ... on EnumValueRemoved {
        enumName
        removedEnumValueName
      }
      ... on EnumValueAdded {
        addedDirectiveDescription
        addedEnumValueName
        enumName
      }
      ... on EnumValueDescriptionChanged {
        enumName
        enumValueName
        newEnumValueDescription
      }
      ... on EnumValueDeprecationReasonChanged {
        enumName
        enumValueName
        newEnumValueDeprecationReason
      }
      ... on EnumValueDeprecationReasonAdded {
        addedValueDeprecationReason
        enumName
        enumValueName
      }
      ... on EnumValueDeprecationReasonRemoved {
        enumName
        enumValueName
        removedEnumValueDeprecationReason
      }
      ... on FieldRemoved {
        removedFieldName
        typeName
        typeType
      }
      ... on FieldAdded {
        addedFieldName
        addedFieldReturnType
        typeName
        typeType
      }
      ... on FieldDescriptionChanged {
        fieldName
        newDescription
        typeName
      }
      ... on FieldDescriptionAdded {
        addedDescription
        fieldName
        typeName
      }
      ... on FieldDescriptionRemoved {
        fieldName
        typeName
      }
      ... on FieldDeprecationAdded {
        deprecationReason
        fieldName
        typeName
      }
      ... on FieldDeprecationRemoved {
        fieldName
        typeName
      }
      ... on FieldDeprecationReasonChanged {
        fieldName
        newDeprecationReason
        typeName
      }
      ... on FieldDeprecationReasonAdded {
        addedDeprecationReason
        fieldName
        typeName
      }
      ... on FieldDeprecationReasonRemoved {
        fieldName
        typeName
      }
      ... on FieldTypeChanged {
        fieldName
        newFieldType
        typeName
      }
      ... on DirectiveUsageUnionMemberAdded {
        addedDirectiveName
        addedUnionMemberTypeName
        unionName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageUnionMemberRemoved {
        removedDirectiveName
        removedUnionMemberTypeName
        unionName
        directiveRepeatedTimes
      }
      ... on FieldArgumentAdded {
        addedArgumentName
        addedArgumentType
        addedToNewField
        fieldName
        typeName
      }
      ... on FieldArgumentRemoved {
        fieldName
        removedFieldArgumentName
        removedFieldType
        typeName
      }
      ... on InputFieldRemoved {
        inputName
        removedFieldName
      }
      ... on InputFieldAdded {
        addedFieldDefault
        addedInputFieldName
        addedInputFieldType
        inputName
      }
      ... on InputFieldDescriptionAdded {
        addedInputFieldDescription
        inputFieldName
        inputName
      }
      ... on InputFieldDescriptionRemoved {
        inputFieldName
        inputName
        removedDescription
      }
      ... on InputFieldDescriptionChanged {
        inputFieldName
        inputName
        newInputFieldDescription
      }
      ... on InputFieldDefaultValueChanged {
        inputFieldName
        inputName
        newDefaultValue
      }
      ... on InputFieldTypeChanged {
        inputFieldName
        inputName
        newInputFieldType
      }
      ... on ObjectTypeInterfaceAdded {
        addedInterfaceName
        objectTypeName
      }
      ... on ObjectTypeInterfaceRemoved {
        objectTypeName
        removedInterfaceName
      }
      ... on SchemaQueryTypeChanged {
        newQueryTypeName
      }
      ... on SchemaMutationTypeChanged {
        newMutationTypeName
      }
      ... on SchemaSubscriptionTypeChanged {
        newSubscriptionTypeName
      }
      ... on TypeRemoved {
        removedTypeName
      }
      ... on TypeAdded {
        addedTypeKind
        addedTypeName
      }
      ... on TypeKindChanged {
        newTypeKind
        typeName
      }
      ... on TypeDescriptionChanged {
        newTypeDescription
        typeName
      }
      ... on TypeDescriptionAdded {
        addedTypeDescription
        typeName
      }
      ... on TypeDescriptionRemoved {
        removedTypeDescription
        typeName
      }
      ... on UnionMemberRemoved {
        removedUnionMemberTypeName
        unionName
      }
      ... on UnionMemberAdded {
        addedUnionMemberTypeName
        unionName
      }
      ... on DirectiveUsageEnumAdded {
        addedDirectiveName
        enumName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageEnumRemoved {
        enumName
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageEnumValueAdded {
        addedDirectiveName
        enumName
        enumValueName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageEnumValueRemoved {
        enumName
        enumValueName
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInputObjectRemoved {
        inputObjectName
        removedDirectiveName
        removedInputFieldName
        removedInputFieldType
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInputObjectAdded {
        addedDirectiveName
        addedInputFieldName
        addedInputFieldType
        inputObjectName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInputFieldDefinitionAdded {
        addedDirectiveName
        inputFieldName
        inputFieldType
        inputObjectName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInputFieldDefinitionRemoved {
        inputFieldName
        inputObjectName
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageFieldAdded {
        addedDirectiveName
        fieldName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageFieldRemoved {
        fieldName
        removedDirectiveName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageScalarAdded {
        addedDirectiveName
        scalarName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageScalarRemoved {
        removedDirectiveName
        scalarName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageObjectAdded {
        addedDirectiveName
        objectName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageObjectRemoved {
        objectName
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInterfaceAdded {
        addedDirectiveName
        interfaceName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageSchemaAdded {
        addedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageSchemaRemoved {
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageFieldDefinitionAdded {
        addedDirectiveName
        fieldName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageFieldDefinitionRemoved {
        fieldName
        removedDirectiveName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageArgumentDefinitionRemoved {
        argumentName
        fieldName
        removedDirectiveName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageInterfaceRemoved {
        interfaceName
        removedDirectiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageArgumentDefinitionAdded {
        addedDirectiveName
        argumentName
        fieldName
        typeName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageArgumentAdded {
        addedArgumentName
        addedArgumentValue
        directiveName
        directiveRepeatedTimes
      }
      ... on DirectiveUsageArgumentRemoved {
        directiveName
        removedArgumentName
        directiveRepeatedTimes
      }
    }
  }
`);

/** Move to utils */
export function toUpperSnakeCase(str: string) {
  // Use a regular expression to find uppercase letters and insert underscores
  // The 'g' flag ensures all occurrences are replaced.
  // The 'replace' function uses a callback to add an underscore before the matched uppercase letter.
  const snakeCaseString = str.replace(/([A-Z])/g, (match, p1, offset) => {
    // If it's the first character, don't add an underscore
    if (offset === 0) {
      return p1;
    }
    return `_${p1}`;
  });

  return snakeCaseString.toUpperCase();
}

// @todo ServiceProposalDetails
export function Proposal(props: {
  beforeSchema: GraphQLSchema | null;
  afterSchema: GraphQLSchema | null;
  reviews: FragmentType<typeof Proposal_ReviewsFragment>;
  serviceName: string;
  className?: string;
}) {
  /**
   * Reviews can change position because the coordinate changes... placing them out of order from their original line numbers.
   * Because of this, we have to fetch every single page of comments...
   * But because generally they are in order, we can take our time doing this. So fetch in small batches.
   *
   * Odds are there will never be so many reviews/comments that this is even a problem.
   */
  const reviewsConnection = useFragment(Proposal_ReviewsFragment, props.reviews);
  const [annotations, reviewssByCoordinate] = useMemo(() => {
    const serviceReviews =
      reviewsConnection?.edges?.filter(edge => {
        return edge.node.serviceName === props.serviceName;
      }) ?? [];
    const reviewssByCoordinate = serviceReviews.reduce((result, review) => {
      const coordinate = review.node.schemaCoordinate;
      if (coordinate) {
        const reviews = result.get(coordinate);
        if (reviews) {
          result.set(review.node.schemaCoordinate!, [...reviews, review]);
        } else {
          result.set(review.node.schemaCoordinate!, [review]);
        }
      }
      // @todo else add to global reviews
      return result;
    }, new Map<string, Array<(typeof serviceReviews)[number]>>());

    const annotate = (coordinate: string, withPreview = false) => {
      const reviews = reviewssByCoordinate.get(coordinate);
      if (reviews) {
        return (
          <>
            {reviews?.map(({ node, cursor }) => (
              <Fragment key={cursor}>
                {/* @todo if node.resolvedBy/resolvedAt is set, then minimize this */}
                {withPreview === true && node.lineText && (
                  <code className="mb-3 block w-full bg-gray-900 p-3 pl-6 text-white">
                    {node.lineText}
                  </code>
                )}
                <ReviewComments review={node} />
              </Fragment>
            ))}
          </>
        );
      }
      return null;
    };
    return [annotate, reviewssByCoordinate];
  }, [props.reviews, props.serviceName]);

  try {
    return (
      <AnnotatedProvider>
        <DetachedAnnotations
          coordinates={reviewssByCoordinate.keys().toArray()}
          annotate={(coordinate, withPreview) => (
            <>
              <div className="p-2 text-sm text-gray-600">
                This comment refers to a schema coordinate that no longer exists.
              </div>
              {annotations(coordinate, withPreview)}
            </>
          )}
        />
        <SchemaDiff
          className={props.className}
          before={props.beforeSchema}
          after={props.afterSchema}
        />
      </AnnotatedProvider>
    );
  } catch (e: unknown) {
    return (
      <div className={props.className}>
        <div className="text-lg">Invalid SDL</div>
        <div>{e instanceof Error ? e.message : String(e)}</div>
      </div>
    );
  }
}
