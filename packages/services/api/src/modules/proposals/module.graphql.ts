import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    createSchemaProposal(input: CreateSchemaProposalInput!): SchemaProposal!
    reviewSchemaProposal(input: ReviewSchemaProposalInput!): SchemaProposalReview!
    commentOnSchemaProposalReview(
      input: CommentOnSchemaProposalReviewInput!
    ): SchemaProposalComment!
  }

  input CreateSchemaProposalInput {
    diffSchemaVersionId: ID!
    title: String!

    """
    The initial changes by serviceName submitted as part of this proposal. Initial versions must have
    unique "serviceName"s.
    """
    initialVersions: [CreateSchemaProposalInitialVersionInput!]! = []

    """
    The default initial stage is OPEN. Set this to true to create this as proposal
    as a DRAFT instead.
    """
    isDraft: Boolean! = false
  }

  input CreateSchemaProposalInitialVersionInput {
    schemaSDL: String!
    serviceName: String
  }

  input ReviewSchemaProposalInput {
    schemaProposalVersionId: ID!
    """
    One or both of stageTransition or initialComment inputs is/are required.
    """
    stageTransition: SchemaProposalStage
    """
    One or both of stageTransition or initialComment inputs is/are required.
    """
    commentBody: String
  }

  input CommentOnSchemaProposalReviewInput {
    schemaProposalReviewId: ID!
    body: String!
  }

  extend type Query {
    schemaProposals(
      after: String
      first: Int! = 30
      input: SchemaProposalsInput
    ): SchemaProposalConnection
    schemaProposal(input: SchemaProposalInput!): SchemaProposal
    schemaProposalReviews(
      after: String
      first: Int! = 30
      input: SchemaProposalReviewsInput!
    ): SchemaProposalReviewConnection
    schemaProposalReview(input: SchemaProposalReviewInput!): SchemaProposalReview
  }

  input SchemaProposalsInput {
    target: TargetReferenceInput!
    userIds: [ID!]
    stages: [SchemaProposalStage!]
  }

  input SchemaProposalInput {
    """
    Unique identifier of the desired SchemaProposal
    """
    id: ID!
  }

  input SchemaProposalReviewInput {
    """
    Unique identifier of the desired SchemaProposalReview.
    """
    id: ID!
  }

  input SchemaProposalReviewsInput {
    schemaProposalId: ID!
  }

  extend type User {
    id: ID!
  }

  extend type Target {
    id: ID!
  }

  type SchemaProposalConnection {
    edges: [SchemaProposalEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalEdge {
    cursor: String!
    node: SchemaProposal!
  }

  extend type SchemaVersion {
    id: ID!
  }

  enum SchemaProposalStage {
    DRAFT
    OPEN
    APPROVED
    IMPLEMENTED
    CLOSED
  }

  type SchemaProposal {
    id: ID!
    createdAt: DateTime!

    """
    A paginated list of reviews.
    """
    reviews(after: String, first: Int! = 30): SchemaProposalReviewConnection

    """
    The current stage of the proposal. Proposals should be transitioned through the
    course of the review from DRAFT, OPEN, APPROVED, IMPLEMENTED, but may be CLOSED
    at any point in its lifecycle prior to being IMPLEMENTED. DRAFT, OPEN, APPROVED,
    and CLOSED may be triggered by user action. But IMPLEMENTED can only happen if
    the target schema contains the proposed changes while the proposal is in the
    APPROVED state.
    """
    stage: SchemaProposalStage!

    """
    The schema Target that this proposal is to be applied to.
    """
    target: Target

    """
    A short title of this proposal. Meant to give others an easy way to refer to this
    set of changes.
    """
    title: String

    description: String

    """
    When the proposal was last modified. Adding a review or comment does not count.
    """
    updatedAt: DateTime!

    """
    The author of the proposal. If no author has been assigned or if that member is
    removed from the org, then this returns null.
    """
    user: User

    versions(
      after: String
      first: Int! = 15
      input: SchemaProposalVersionsInput
    ): SchemaProposalVersionConnection

    commentsCount: Int!
  }

  type SchemaProposalReviewEdge {
    cursor: String!
    node: SchemaProposalReview!
  }

  type SchemaProposalReviewConnection {
    edges: [SchemaProposalReviewEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalVersionEdge {
    cursor: String!
    node: SchemaProposalVersion!
  }

  type SchemaProposalVersionConnection {
    edges: [SchemaProposalVersionEdge!]
    pageInfo: PageInfo!
  }

  input SchemaProposalVersionsInput {
    """
    Option to return only the latest version of each schema proposal. Versions
    """
    onlyLatest: Boolean! = false

    """
    Limit the returned SchemaProposalVersions to a single version. This can still
    return multiple elements if that version changed multiple services.
    """
    schemaProposalVersionId: ID
  }

  # @key(fields: "id serviceName")
  type SchemaProposalVersion {
    """
    An identifier for a list of SchemaProposalVersions.
    """
    id: ID!

    """
    The service that this version applies to.
    """
    serviceName: String

    createdAt: DateTime!

    """
    The SchemaProposal that this version belongs to. A proposal can have
    multiple versions.
    """
    schemaProposal: SchemaProposal!

    """
    The user who submitted this version of the proposal.
    """
    user: User

    """
    The list of proposed changes to the Target.
    """
    changes: [SchemaChange]!

    """
    A paginated list of reviews.
    """
    reviews(after: String, first: Int! = 30): SchemaProposalReviewConnection
  }

  type SchemaProposalCommentEdge {
    cursor: String!
    node: SchemaProposalComment!
  }

  type SchemaProposalCommentConnection {
    edges: [SchemaProposalCommentEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalReview {
    """
    A UUID unique to this review. Used for querying.
    """
    id: ID!

    """
    Comments attached to this review.
    """
    comments(after: String, first: Int! = 200): SchemaProposalCommentConnection

    """
    When the review was first made. Only a review's comments are mutable, so there is no
    updatedAt on the review.
    """
    createdAt: DateTime!

    """
    The text on the line at the time of being reviewed. This should be displayed if that
    coordinate's text has been modified

    If the "lineText" is null then this review references the entire SchemaProposalVersion
    and not any specific line within the proposal.
    """
    lineText: String

    """
    The coordinate being referenced by this review. This is the most accurate location and should be used prior
    to falling back to the lineNumber. Only if this coordinate does not exist in the comparing schema, should the line number be used.
    """
    schemaCoordinate: String

    """
    The specific version of the proposal that this review is for.
    """
    schemaProposalVersion: SchemaProposalVersion

    """
    If null then this review is just a comment. Otherwise, the reviewer changed the state of the
    proposal as part of their review. E.g. The reviewer can approve a version with a comment.
    """
    stageTransition: SchemaProposalStage

    """
    The author of this review.
    """
    user: User
  }

  type SchemaProposalComment {
    id: ID!

    createdAt: DateTime!

    """
    Content of this comment. E.g. "Nice job!"
    """
    body: String!

    updatedAt: DateTime!

    """
    The author of this comment
    """
    user: User
  }

  extend type SchemaChange {
    meta: SchemaChangeMeta
  }

  union SchemaChangeMeta =
    | FieldArgumentDefaultChanged
    | FieldArgumentDescriptionChanged
    | FieldArgumentTypeChanged
    | DirectiveRemoved
    | DirectiveAdded
    | DirectiveDescriptionChanged
    | DirectiveLocationAdded
    | DirectiveLocationRemoved
    | DirectiveArgumentAdded
    | DirectiveArgumentRemoved
    | DirectiveArgumentDescriptionChanged
    | DirectiveArgumentDefaultValueChanged
    | DirectiveArgumentTypeChanged
    | EnumValueRemoved
    | EnumValueAdded
    | EnumValueDescriptionChanged
    | EnumValueDeprecationReasonChanged
    | EnumValueDeprecationReasonAdded
    | EnumValueDeprecationReasonRemoved
    | FieldRemoved
    | FieldAdded
    | FieldDescriptionChanged
    | FieldDescriptionAdded
    | FieldDescriptionRemoved
    | FieldDeprecationAdded
    | FieldDeprecationRemoved
    | FieldDeprecationReasonChanged
    | FieldDeprecationReasonAdded
    | FieldDeprecationReasonRemoved
    | FieldTypeChanged
    | DirectiveUsageUnionMemberAdded
    | DirectiveUsageUnionMemberRemoved
    | FieldArgumentAdded
    | FieldArgumentRemoved
    | InputFieldRemoved
    | InputFieldAdded
    | InputFieldDescriptionAdded
    | InputFieldDescriptionRemoved
    | InputFieldDescriptionChanged
    | InputFieldDefaultValueChanged
    | InputFieldTypeChanged
    | ObjectTypeInterfaceAdded
    | ObjectTypeInterfaceRemoved
    | SchemaQueryTypeChanged
    | SchemaMutationTypeChanged
    | SchemaSubscriptionTypeChanged
    | TypeRemoved
    | TypeAdded
    | TypeKindChanged
    | TypeDescriptionChanged
    | TypeDescriptionAdded
    | TypeDescriptionRemoved
    | UnionMemberRemoved
    | UnionMemberAdded
    | DirectiveUsageEnumAdded
    | DirectiveUsageEnumRemoved
    | DirectiveUsageEnumValueAdded
    | DirectiveUsageEnumValueRemoved
    | DirectiveUsageInputObjectRemoved
    | DirectiveUsageInputObjectAdded
    | DirectiveUsageInputFieldDefinitionAdded
    | DirectiveUsageInputFieldDefinitionRemoved
    | DirectiveUsageFieldAdded
    | DirectiveUsageFieldRemoved
    | DirectiveUsageScalarAdded
    | DirectiveUsageScalarRemoved
    | DirectiveUsageObjectAdded
    | DirectiveUsageObjectRemoved
    | DirectiveUsageInterfaceAdded
    | DirectiveUsageSchemaAdded
    | DirectiveUsageSchemaRemoved
    | DirectiveUsageFieldDefinitionAdded
    | DirectiveUsageFieldDefinitionRemoved
    | DirectiveUsageArgumentDefinitionRemoved
    | DirectiveUsageInterfaceRemoved
    | DirectiveUsageArgumentDefinitionAdded
    | DirectiveUsageArgumentAdded
    | DirectiveUsageArgumentRemoved

  # Directive

  type FieldArgumentDescriptionChanged {
    typeName: String!
    fieldName: String!
    argumentName: String!
    oldDescription: String
    newDescription: String
  }

  type FieldArgumentDefaultChanged {
    typeName: String!
    fieldName: String!
    argumentName: String!
    oldDefaultValue: String
    newDefaultValue: String
  }

  type FieldArgumentTypeChanged {
    typeName: String!
    fieldName: String!
    argumentName: String!
    oldArgumentType: String!
    newArgumentType: String!
    isSafeArgumentTypeChange: Boolean
  }

  type DirectiveRemoved {
    removedDirectiveName: String!
  }

  type DirectiveAdded {
    addedDirectiveName: String!
    addedDirectiveRepeatable: Boolean
    addedDirectiveLocations: [String!]!
    addedDirectiveDescription: String
  }

  type DirectiveDescriptionChanged {
    directiveName: String!
    oldDirectiveDescription: String
    newDirectiveDescription: String
  }

  type DirectiveLocationAdded {
    directiveName: String!
    addedDirectiveLocation: String!
  }

  type DirectiveLocationRemoved {
    directiveName: String!
    removedDirectiveLocation: String!
  }

  type DirectiveArgumentAdded {
    directiveName: String!
    addedDirectiveArgumentName: String!
    addedDirectiveArgumentTypeIsNonNull: Boolean
    addedToNewDirective: Boolean
    addedDirectiveArgumentDescription: String
    addedDirectiveArgumentType: String!
    addedDirectiveDefaultValue: String
  }

  type DirectiveArgumentRemoved {
    directiveName: String!
    removedDirectiveArgumentName: String!
  }

  type DirectiveArgumentDescriptionChanged {
    directiveName: String!
    directiveArgumentName: String!
    oldDirectiveArgumentDescription: String
    newDirectiveArgumentDescription: String
  }

  type DirectiveArgumentDefaultValueChanged {
    directiveName: String!
    directiveArgumentName: String!
    oldDirectiveArgumentDefaultValue: String
    newDirectiveArgumentDefaultValue: String
  }

  type DirectiveArgumentTypeChanged {
    directiveName: String!
    directiveArgumentName: String!
    oldDirectiveArgumentType: String!
    newDirectiveArgumentType: String!
    isSafeDirectiveArgumentTypeChange: Boolean
  }

  # Enum

  type EnumValueRemoved {
    enumName: String!
    removedEnumValueName: String!
    isEnumValueDeprecated: Boolean
  }

  type EnumValueAdded {
    enumName: String!
    addedEnumValueName: String!
    addedToNewType: Boolean
    addedDirectiveDescription: String
  }

  type EnumValueDescriptionChanged {
    enumName: String!
    enumValueName: String!
    oldEnumValueDescription: String
    newEnumValueDescription: String
  }

  type EnumValueDeprecationReasonChanged {
    enumName: String!
    enumValueName: String!
    oldEnumValueDeprecationReason: String!
    newEnumValueDeprecationReason: String!
  }

  type EnumValueDeprecationReasonAdded {
    enumName: String!
    enumValueName: String!
    addedValueDeprecationReason: String!
  }

  type EnumValueDeprecationReasonRemoved {
    enumName: String!
    enumValueName: String!
    removedEnumValueDeprecationReason: String!
  }

  # Field

  type FieldRemoved {
    typeName: String!
    removedFieldName: String!
    isRemovedFieldDeprecated: Boolean
    typeType: String!
  }

  type FieldAdded {
    typeName: String!
    addedFieldName: String!
    typeType: String!
    addedFieldReturnType: String!
  }

  type FieldDescriptionChanged {
    typeName: String!
    fieldName: String!
    oldDescription: String
    newDescription: String
  }

  type FieldDescriptionAdded {
    typeName: String!
    fieldName: String!
    addedDescription: String!
  }

  type FieldDescriptionRemoved {
    typeName: String!
    fieldName: String!
  }

  type FieldDeprecationAdded {
    typeName: String!
    fieldName: String!
    deprecationReason: String!
  }

  type FieldDeprecationRemoved {
    typeName: String!
    fieldName: String!
  }

  type FieldDeprecationReasonChanged {
    typeName: String!
    fieldName: String!
    oldDeprecationReason: String!
    newDeprecationReason: String!
  }

  type FieldDeprecationReasonAdded {
    typeName: String!
    fieldName: String!
    addedDeprecationReason: String!
  }

  type FieldDeprecationReasonRemoved {
    typeName: String!
    fieldName: String!
  }

  type FieldTypeChanged {
    typeName: String!
    fieldName: String!
    oldFieldType: String!
    newFieldType: String!
    isSafeFieldTypeChange: Boolean
  }

  type DirectiveUsageUnionMemberAdded {
    unionName: String!
    addedUnionMemberTypeName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageUnionMemberRemoved {
    unionName: String!
    removedUnionMemberTypeName: String!
    removedDirectiveName: String!
  }

  type FieldArgumentAdded {
    typeName: String!
    fieldName: String!
    addedArgumentName: String!
    addedArgumentType: String!
    hasDefaultValue: Boolean
    isAddedFieldArgumentBreaking: Boolean
    addedToNewField: Boolean
  }

  type FieldArgumentRemoved {
    typeName: String!
    fieldName: String!
    removedFieldArgumentName: String!
    removedFieldType: String!
  }

  # Input

  type InputFieldRemoved {
    inputName: String!
    removedFieldName: String!
    isInputFieldDeprecated: Boolean
  }

  type InputFieldAdded {
    inputName: String!
    addedInputFieldName: String!
    isAddedInputFieldTypeNullable: Boolean
    addedInputFieldType: String!
    addedFieldDefault: String
    addedToNewType: Boolean
  }

  type InputFieldDescriptionAdded {
    inputName: String!
    inputFieldName: String!
    addedInputFieldDescription: String!
  }

  type InputFieldDescriptionRemoved {
    inputName: String!
    inputFieldName: String!
    removedDescription: String!
  }

  type InputFieldDescriptionChanged {
    inputName: String!
    inputFieldName: String!
    oldInputFieldDescription: String!
    newInputFieldDescription: String!
  }

  type InputFieldDefaultValueChanged {
    inputName: String!
    inputFieldName: String!
    oldDefaultValue: String
    newDefaultValue: String
  }

  type InputFieldTypeChanged {
    inputName: String!
    inputFieldName: String!
    oldInputFieldType: String!
    newInputFieldType: String!
    isInputFieldTypeChangeSafe: Boolean
  }

  # Type

  type ObjectTypeInterfaceAdded {
    objectTypeName: String!
    addedInterfaceName: String!
    addedToNewType: Boolean
  }

  type ObjectTypeInterfaceRemoved {
    objectTypeName: String!
    removedInterfaceName: String!
  }

  # Schema

  type SchemaQueryTypeChanged {
    oldQueryTypeName: String!
    newQueryTypeName: String!
  }

  type SchemaMutationTypeChanged {
    oldMutationTypeName: String!
    newMutationTypeName: String!
  }

  type SchemaSubscriptionTypeChanged {
    oldSubscriptionTypeName: String!
    newSubscriptionTypeName: String!
  }

  # Type

  type TypeRemoved {
    removedTypeName: String!
  }

  scalar GraphQLKind

  type TypeAdded {
    addedTypeName: String!
    addedTypeKind: GraphQLKind
  }

  type TypeKindChanged {
    typeName: String!
    oldTypeKind: String!
    newTypeKind: String!
  }

  type TypeDescriptionChanged {
    typeName: String!
    oldTypeDescription: String!
    newTypeDescription: String!
  }

  type TypeDescriptionAdded {
    typeName: String!
    addedTypeDescription: String!
  }

  type TypeDescriptionRemoved {
    typeName: String!
    removedTypeDescription: String!
  }

  # Union

  type UnionMemberRemoved {
    unionName: String!
    removedUnionMemberTypeName: String!
  }

  type UnionMemberAdded {
    unionName: String!
    addedUnionMemberTypeName: String!
    addedToNewType: Boolean
  }

  # Directive Usage

  type DirectiveUsageEnumAdded {
    enumName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageEnumRemoved {
    enumName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageEnumValueAdded {
    enumName: String!
    enumValueName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageEnumValueRemoved {
    enumName: String!
    enumValueName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageInputObjectRemoved {
    inputObjectName: String!
    removedInputFieldName: String!
    isRemovedInputFieldTypeNullable: Boolean
    removedInputFieldType: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageInputObjectAdded {
    inputObjectName: String!
    addedInputFieldName: String!
    isAddedInputFieldTypeNullable: Boolean
    addedInputFieldType: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageInputFieldDefinitionAdded {
    inputObjectName: String!
    inputFieldName: String!
    inputFieldType: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageInputFieldDefinitionRemoved {
    inputObjectName: String!
    inputFieldName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageFieldAdded {
    typeName: String!
    fieldName: String!
    addedDirectiveName: String!
  }

  type DirectiveUsageFieldRemoved {
    typeName: String!
    fieldName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageScalarAdded {
    scalarName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageScalarRemoved {
    scalarName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageObjectAdded {
    objectName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageObjectRemoved {
    objectName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageInterfaceAdded {
    interfaceName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageSchemaAdded {
    addedDirectiveName: String!
    schemaTypeName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageSchemaRemoved {
    removedDirectiveName: String!
    schemaTypeName: String!
  }

  type DirectiveUsageFieldDefinitionAdded {
    typeName: String!
    fieldName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageFieldDefinitionRemoved {
    typeName: String!
    fieldName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageArgumentDefinitionRemoved {
    typeName: String!
    fieldName: String!
    argumentName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageInterfaceRemoved {
    interfaceName: String!
    removedDirectiveName: String!
  }

  type DirectiveUsageArgumentDefinitionAdded {
    typeName: String!
    fieldName: String!
    argumentName: String!
    addedDirectiveName: String!
    addedToNewType: Boolean
  }

  type DirectiveUsageArgumentAdded {
    directiveName: String!
    addedArgumentName: String!
    addedArgumentValue: String!
    oldArgumentValue: String
    parentTypeName: String
    parentFieldName: String
    parentArgumentName: String
    parentEnumValueName: String
  }

  type DirectiveUsageArgumentRemoved {
    directiveName: String!
    removedArgumentName: String!
    parentTypeName: String
    parentFieldName: String
    parentArgumentName: String
    parentEnumValueName: String
  }
`;
