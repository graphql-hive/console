import { Fragment, useMemo } from 'react';
import { GraphQLSchema } from 'graphql';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DetachedAnnotations, ReviewComments } from './Review';
import { AnnotatedProvider } from './schema-diff/components';
import { SchemaDiff } from './schema-diff/schema-diff';

/**
 * Fragment containing a list of reviews. Each review is tied to a coordinate
 * and may contain one or more comments. This should be fetched in its entirety,
 * but this can be done serially because there should not be so many reviews within
 * a single screen's height that it matters.
 * */
export const ProposalOverview_ReviewsFragment = graphql(/** GraphQL */ `
  fragment ProposalOverview_ReviewsFragment on SchemaProposalReviewConnection {
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
export const ProposalOverview_ChangeFragment = graphql(/* GraphQL */ `
  fragment ProposalOverview_ChangeFragment on SchemaChange {
    message(withSafeBasedOnUsageNote: false)
    path
    severityLevel
    meta {
      __typename
      ... on FieldArgumentDescriptionChanged {
        argumentName
        fieldName
        newDescription
        oldDescription
        typeName
      }
      ... on FieldArgumentTypeChanged {
        argumentName
        fieldName
        isSafeArgumentTypeChange
        newArgumentType
        oldArgumentType
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
        oldDirectiveDescription
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
        oldDirectiveArgumentDescription
      }
      ... on DirectiveArgumentDefaultValueChanged {
        directiveArgumentName
        directiveName
        newDirectiveArgumentDefaultValue
        oldDirectiveArgumentDefaultValue
      }
      ... on DirectiveArgumentTypeChanged {
        directiveArgumentName
        directiveName
        newDirectiveArgumentType
        oldDirectiveArgumentType
      }
      ... on EnumValueRemoved {
        enumName
        removedEnumValueName
      }
      ... on EnumValueAdded {
        addedDirectiveDescription
        addedEnumValueName
        addedToNewType
        enumName
      }
      ... on EnumValueDescriptionChanged {
        enumName
        enumValueName
        newEnumValueDescription
        oldEnumValueDescription
      }
      ... on EnumValueDeprecationReasonChanged {
        enumName
        enumValueName
        newEnumValueDeprecationReason
        oldEnumValueDeprecationReason
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
        oldDescription
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
        oldDeprecationReason
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
        oldFieldType
        typeName
      }
      ... on DirectiveUsageUnionMemberAdded {
        addedDirectiveName
        addedUnionMemberTypeName
        addedUnionMemberTypeName
        unionName
      }
      ... on DirectiveUsageUnionMemberRemoved {
        removedDirectiveName
        removedUnionMemberTypeName
        unionName
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
        addedToNewType
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
        oldInputFieldDescription
      }
      ... on InputFieldDefaultValueChanged {
        inputFieldName
        inputName
        newDefaultValue
        oldDefaultValue
      }
      ... on InputFieldTypeChanged {
        inputFieldName
        inputName
        newInputFieldType
        oldInputFieldType
      }
      ... on ObjectTypeInterfaceAdded {
        addedInterfaceName
        addedToNewType
        objectTypeName
      }
      ... on ObjectTypeInterfaceRemoved {
        objectTypeName
        removedInterfaceName
      }
      ... on SchemaQueryTypeChanged {
        newQueryTypeName
        oldQueryTypeName
      }
      ... on SchemaMutationTypeChanged {
        newMutationTypeName
        oldMutationTypeName
      }
      ... on SchemaSubscriptionTypeChanged {
        newSubscriptionTypeName
        oldSubscriptionTypeName
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
        oldTypeKind
        typeName
      }
      ... on TypeDescriptionChanged {
        newTypeDescription
        oldTypeDescription
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
        addedToNewType
        addedUnionMemberTypeName
        unionName
      }
      ... on DirectiveUsageEnumAdded {
        addedDirectiveName
        addedToNewType
        enumName
      }
      ... on DirectiveUsageEnumRemoved {
        enumName
        removedDirectiveName
      }
      ... on DirectiveUsageEnumValueAdded {
        addedDirectiveName
        addedToNewType
        enumName
        enumValueName
      }
      ... on DirectiveUsageEnumValueRemoved {
        enumName
        enumValueName
        removedDirectiveName
      }
      ... on DirectiveUsageInputObjectRemoved {
        inputObjectName
        removedDirectiveName
        removedInputFieldName
        removedInputFieldType
      }
      ... on DirectiveUsageInputObjectAdded {
        addedDirectiveName
        addedInputFieldName
        addedInputFieldType
        addedToNewType
        inputObjectName
      }
      ... on DirectiveUsageInputFieldDefinitionAdded {
        addedDirectiveName
        addedToNewType
        inputFieldName
        inputFieldType
        inputObjectName
      }
      ... on DirectiveUsageInputFieldDefinitionRemoved {
        inputFieldName
        inputObjectName
        removedDirectiveName
      }
      ... on DirectiveUsageFieldAdded {
        addedDirectiveName
        fieldName
        typeName
      }
      ... on DirectiveUsageFieldRemoved {
        fieldName
        removedDirectiveName
        typeName
      }
      ... on DirectiveUsageScalarAdded {
        addedDirectiveName
        addedToNewType
        scalarName
      }
      ... on DirectiveUsageScalarRemoved {
        removedDirectiveName
        scalarName
      }
      ... on DirectiveUsageObjectAdded {
        addedDirectiveName
        addedToNewType
        objectName
      }
      ... on DirectiveUsageObjectRemoved {
        objectName
        removedDirectiveName
      }
      ... on DirectiveUsageInterfaceAdded {
        addedDirectiveName
        addedToNewType
        interfaceName
      }
      ... on DirectiveUsageSchemaAdded {
        addedDirectiveName
        addedToNewType
        schemaTypeName
      }
      ... on DirectiveUsageSchemaRemoved {
        removedDirectiveName
        schemaTypeName
      }
      ... on DirectiveUsageFieldDefinitionAdded {
        addedDirectiveName
        addedToNewType
        fieldName
        typeName
      }
      ... on DirectiveUsageFieldDefinitionRemoved {
        fieldName
        removedDirectiveName
        typeName
      }
      ... on DirectiveUsageArgumentDefinitionRemoved {
        argumentName
        fieldName
        removedDirectiveName
        typeName
      }
      ... on DirectiveUsageInterfaceRemoved {
        interfaceName
        removedDirectiveName
      }
      ... on DirectiveUsageArgumentDefinitionAdded {
        addedDirectiveName
        addedToNewType
        argumentName
        fieldName
        typeName
      }
      ... on DirectiveUsageArgumentAdded {
        addedArgumentName
        addedArgumentValue
        directiveName
        oldArgumentValue
      }
      ... on DirectiveUsageArgumentRemoved {
        directiveName
        removedArgumentName
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
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
  serviceName: string;
}) {
  /**
   * Reviews can change position because the coordinate changes... placing them out of order from their original line numbers.
   * Because of this, we have to fetch every single page of comments...
   * But because generally they are in order, we can take our time doing this. So fetch in small batches.
   *
   * Odds are there will never be so many reviews/comments that this is even a problem.
   */
  const [annotations, reviewssByCoordinate] = useMemo(() => {
    const reviewsConnection = useFragment(ProposalOverview_ReviewsFragment, props.reviews);
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
    // THIS IS IMPORTANT!! <SchemaDiff/> must be rendered first so that it sets up the state in the
    // AnnotatedContext for <DetachedAnnotations/>. Otherwise, the DetachedAnnotations will be empty.
    const diff =
      props.beforeSchema && props.afterSchema ? (
        <SchemaDiff
          before={props.beforeSchema}
          after={props.afterSchema}
          annotations={annotations}
        />
      ) : (
        <></>
      );

    // @todo AnnotatedProvider doesnt work 100% of the time... A different solution must be found
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
        {diff}
      </AnnotatedProvider>
    );
  } catch (e: unknown) {
    return (
      <>
        <div className="text-lg">Invalid SDL</div>
        <div>{e instanceof Error ? e.message : String(e)}</div>
      </>
    );
  }
}
