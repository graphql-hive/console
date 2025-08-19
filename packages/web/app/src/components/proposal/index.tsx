import { buildSchema } from 'graphql';
import { FragmentType, graphql, useFragment } from '@/gql';
import type { Change } from '@graphql-inspector/core';
import { patchSchema } from '@graphql-inspector/patch';
import { ReviewComments } from './Review';
import { SchemaDiff } from './schema-diff/schema-diff';

/**
 * Fragment containing a list of reviews. Each review is tied to a coordinate
 * and may contain one or more comments. This should be fetched in its entirety,
 * but this can be done serially because there should not be so many reviews within
 * a single screen's height that it matters.
 * */
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
        }
        stageTransition
        lineText
        schemaCoordinate
        ...ProposalOverview_ReviewCommentsFragment
      }
    }
  }
`);

const ProposalOverview_ChangeFragment = graphql(/* GraphQL */ `
  fragment ProposalOverview_ChangeFragment on SchemaChange {
    message
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
        isSafeDirectiveArgumentTypeChange
        newDirectiveArgumentType
        oldDirectiveArgumentType
      }
      ... on EnumValueRemoved {
        enumName
        isEnumValueDeprecated
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
        isRemovedFieldDeprecated
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
        isSafeFieldTypeChange
        newFieldType
        oldFieldType
        typeName
      }
      ... on DirectiveUsageUnionMemberAdded {
        addedDirectiveName
        addedToNewType
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
        hasDefaultValue
        isAddedFieldArgumentBreaking
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
        isInputFieldDeprecated
        removedFieldName
      }
      ... on InputFieldAdded {
        addedFieldDefault
        addedInputFieldName
        addedInputFieldType
        addedToNewType
        inputName
        isAddedInputFieldTypeNullable
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
        isInputFieldTypeChangeSafe
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
        isRemovedInputFieldTypeNullable
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
        isAddedInputFieldTypeNullable
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
        parentArgumentName
        parentEnumValueName
        parentFieldName
        parentTypeName
      }
      ... on DirectiveUsageArgumentRemoved {
        directiveName
        parentArgumentName
        parentEnumValueName
        parentFieldName
        parentTypeName
        removedArgumentName
      }
    }
  }
`);

function toUpperSnakeCase(str: string) {
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

export function Proposal(props: {
  baseSchemaSDL: string;
  changes: (FragmentType<typeof ProposalOverview_ChangeFragment> | null | undefined)[] | null;
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
  const reviewsConnection = useFragment(ProposalOverview_ReviewsFragment, props.reviews);
  try {
    const serviceReviews =
      reviewsConnection?.edges?.filter(edge => {
        const { schemaProposalVersion } = edge.node;
        return schemaProposalVersion?.serviceName === props.serviceName;
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
      return result;
    }, new Map<string, Array<(typeof serviceReviews)[number]>>());

    const annotations = (coordinate: string) => {
      const reviews = reviewssByCoordinate.get(coordinate);
      if (reviews) {
        return (
          <>{reviews?.map(({ node, cursor }) => <ReviewComments key={cursor} review={node} />)}</>
        );
      }
      return null;
    };

    const before = buildSchema(props.baseSchemaSDL, { assumeValid: true, assumeValidSDL: true });
    const changes =
      props.changes
        ?.map((change): Change<any> | null => {
          const c = useFragment(ProposalOverview_ChangeFragment, change);
          if (c) {
            return {
              criticality: {
                // isSafeBasedOnUsage: ,
                // reason: ,
                level: c.severityLevel as any,
              },
              message: c.message,
              meta: c.meta,
              type: (c.meta && toUpperSnakeCase(c.meta?.__typename)) ?? '', // convert to upper snake
              path: c.path?.join('.'),
            };
          }
          return null;
        })
        .filter(c => !!c) ?? [];
    const after = patchSchema(before, changes, { throwOnError: false });
    return <SchemaDiff before={before} after={after} annotations={annotations} />;
  } catch (e: unknown) {
    return (
      <>
        <div className="text-lg">Invalid SDL</div>
        <div>{e instanceof Error ? e.message : String(e)}</div>
      </>
    );
  }
}
