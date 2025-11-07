import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    organization(
      """
      Reference to the organization that should be fetched.
      """
      reference: OrganizationReferenceInput! @tag(name: "public")
    ): Organization @tag(name: "public")
    organizationByInviteCode(code: String!): OrganizationByInviteCodePayload
    organizations: OrganizationConnection!
    organizationTransferRequest(
      selector: OrganizationTransferRequestSelector!
    ): OrganizationTransfer
    myDefaultOrganization(previouslyVisitedOrganizationId: ID): OrganizationPayload
    organizationBySlug(organizationSlug: String!): Organization
  }

  extend type Mutation {
    createOrganization(input: CreateOrganizationInput!): CreateOrganizationResult!
    deleteOrganization(selector: OrganizationSelectorInput!): OrganizationPayload!
    deleteOrganizationMember(input: OrganizationMemberInput!): OrganizationPayload!
    joinOrganization(code: String!): JoinOrganizationPayload!
    leaveOrganization(input: OrganizationSelectorInput!): LeaveOrganizationResult!
    inviteToOrganizationByEmail(
      input: InviteToOrganizationByEmailInput! @tag(name: "public")
    ): InviteToOrganizationByEmailResult! @tag(name: "public")
    deleteOrganizationInvitation(
      input: DeleteOrganizationInvitationInput! @tag(name: "public")
    ): DeleteOrganizationInvitationResult! @tag(name: "public")
    updateOrganizationSlug(input: UpdateOrganizationSlugInput!): UpdateOrganizationSlugResult!
    requestOrganizationTransfer(
      input: RequestOrganizationTransferInput!
    ): RequestOrganizationTransferResult!
    answerOrganizationTransferRequest(
      input: AnswerOrganizationTransferRequestInput!
    ): AnswerOrganizationTransferRequestResult!
    """
    Create a new member role with permissions.
    """
    createMemberRole(input: CreateMemberRoleInput! @tag(name: "public")): CreateMemberRoleResult!
      @tag(name: "public")
    updateMemberRole(input: UpdateMemberRoleInput! @tag(name: "public")): UpdateMemberRoleResult!
      @tag(name: "public")
    deleteMemberRole(input: DeleteMemberRoleInput! @tag(name: "public")): DeleteMemberRoleResult!
      @tag(name: "public")
    assignMemberRole(input: AssignMemberRoleInput! @tag(name: "public")): AssignMemberRoleResult!
      @tag(name: "public")
    """
    Create a new access token scoped to an organization.
    """
    createOrganizationAccessToken(
      input: CreateOrganizationAccessTokenInput! @tag(name: "public")
    ): CreateOrganizationAccessTokenResult! @tag(name: "public")

    """
    Create a new access token scoped to a project.
    """
    createProjectAccessToken(input: CreateProjectAccessTokenInput!): CreateProjectAccessTokenResult!

    """
    Create a new personal access token for the current actor/user.
    """
    createPersonalAccessToken(
      input: CreatePersonalAccessTokenInput!
    ): CreatePersonalAccessTokenResult!

    """
    Delete an organization-level access token.
    """
    deleteOrganizationAccessToken(
      input: DeleteOrganizationAccessTokenInput! @tag(name: "public")
    ): DeleteOrganizationAccessTokenResult!
      @tag(name: "public")
      @deprecated(reason: "Please use 'Mutation.deleteAccessToken' instead.")

    """
    Delete any type of access token (organization, project, or personal).
    """
    deleteAccessToken(
      input: DeleteAccessTokenInput! @tag(name: "public")
    ): DeleteAccessTokenResult! @tag(name: "public")
  }

  """
  Input for deleting an existing organization access token.
  """
  input DeleteOrganizationAccessTokenInput {
    """
    Reference to the organization access token that should be deleted.
    """
    organizationAccessToken: OrganizationAccessTokenReference! @tag(name: "public")
  }

  """
  Reference input for identifying an organization access token.
  """
  input OrganizationAccessTokenReference @oneOf @tag(name: "public") {
    """
    Identify the access token by its unique ID.
    """
    byId: ID @tag(name: "public")
  }

  """
  Result returned after attempting to delete an organization access token.
  """
  type DeleteOrganizationAccessTokenResult {
    """
    Indicates a successful deletion.
    """
    ok: DeleteOrganizationAccessTokenResultOk @tag(name: "public")

    """
    Contains error details if the deletion failed.
    """
    error: DeleteOrganizationAccessTokenResultError @tag(name: "public")
  }

  """
  Payload returned on successful organization access token deletion.
  """
  type DeleteOrganizationAccessTokenResultOk {
    """
    The ID of the organization access token that was deleted.
    """
    deletedOrganizationAccessTokenId: ID! @tag(name: "public")
  }

  """
  Payload returned when an organization access token deletion fails.
  """
  type DeleteOrganizationAccessTokenResultError {
    """
    A human-readable message describing the reason for the failure.
    """
    message: String! @tag(name: "public")
  }

  """
  Input for creating a new personal access token.
  """
  input CreatePersonalAccessTokenInput {
    """
    The organization in which the access token should be created.
    """
    organization: OrganizationReferenceInput!

    """
    Human-readable title for the access token.
    """
    title: String!

    """
    Optional description providing additional context about the purpose of the access token.
    """
    description: String

    """
    List of permissions assigned to the access token.
    A list of available permissions can be retrieved via the
    'Member.availablePersonalAccessTokenPermissionGroups' field.
    """
    permissions: [String!]

    """
    Resources on which the permissions should be granted (e.g., project, target, service, or app deployments).
    Permissions are inherited by sub-resources.
    """
    resources: ResourceAssignmentInput
  }

  """
  Result returned when the creation of a personal access token succeeds.
  """
  type CreatePersonalAccessTokenResultOk {
    """
    The newly created personal access token.
    """
    createdPersonalAccessToken: PersonalAccessToken!

    """
    The private access key corresponding to the new token.
    This value is only returned once at creation time and cannot be retrieved later.
    """
    privateAccessKey: String!
  }

  """
  Result returned when the creation of a personal access token fails.
  """
  type CreatePersonalAccessTokenResultError {
    """
    A human-readable message describing the reason for the failure.
    """
    message: String!

    """
    Field-specific validation error details, if any.
    """
    details: CreatePersonalAccessTokenResultErrorDetails
  }

  """
  Field-level validation error details for personal access token creation.
  """
  type CreatePersonalAccessTokenResultErrorDetails {
    """
    Validation error message related to the provided title.
    """
    title: String

    """
    Validation error message related to the provided description.
    """
    description: String
  }

  """
  Top-level result object for creating a personal access token.
  """
  type CreatePersonalAccessTokenResult {
    """
    Indicates a successful creation.
    """
    ok: CreatePersonalAccessTokenResultOk

    """
    Contains error information if the creation failed.
    """
    error: CreatePersonalAccessTokenResultError
  }

  """
  Input for creating a new project-scoped access token.
  """
  input CreateProjectAccessTokenInput {
    """
    The project in which the access token should be created.
    """
    project: ProjectReferenceInput!

    """
    Human-readable title for the access token.
    """
    title: String!

    """
    Optional description providing additional context about the purpose of the access token.
    """
    description: String

    """
    List of permissions assigned to the access token.
    Available permissions can be retrieved via the
    'Project.availableProjectAccessTokenPermissionGroups' field.
    """
    permissions: [String!]!

    """
    Resources on which the permissions should be granted (e.g.,  target, service, or app deployments).
    Permissions are inherited by sub-resources.
    """
    resources: ProjectTargetsResourceAssignmentInput!
  }

  """
  Result returned when the creation of a project access token succeeds.
  """
  type CreateProjectAccessTokenResultOk {
    """
    The newly created project access token.
    """
    createdProjectAccessToken: ProjectAccessToken!

    """
    The private access key corresponding to the new token.
    This value is only returned once at creation time and cannot be retrieved later.
    """
    privateAccessKey: String!
  }

  """
  Field-level validation error details for project access token creation.
  """
  type CreateProjectAccessTokenResultErrorDetails {
    """
    Validation error message related to the provided title.
    """
    title: String

    """
    Validation error message related to the provided description.
    """
    description: String
  }

  """
  Result returned when the creation of a project access token fails.
  """
  type CreateProjectAccessTokenResultError {
    """
    A human-readable message describing the reason for the failure.
    """
    message: String

    """
    Field-specific validation error details, if any.
    """
    details: CreateProjectAccessTokenResultErrorDetails
  }

  """
  Top-level result object for creating a project access token.

  @oneOf
  """
  type CreateProjectAccessTokenResult {
    """
    Indicates a successful creation.
    """
    ok: CreateProjectAccessTokenResultOk

    """
    Contains error information if the creation failed.
    """
    error: CreateProjectAccessTokenResultError
  }

  """
  Reference input for identifying an organization.
  """
  input OrganizationReferenceInput @oneOf {
    """
    Select an organization using a selector (e.g., slug-based selection).
    """
    bySelector: OrganizationSelectorInput @tag(name: "public")

    """
    Select an organization using its unique ID.
    """
    byId: ID @tag(name: "public")
  }

  """
  Input for creating a new organization-scoped access token.
  """
  input CreateOrganizationAccessTokenInput {
    """
    The organization in which the access token should be created.
    """
    organization: OrganizationReferenceInput! @tag(name: "public")

    """
    Human-readable title for the access token.
    """
    title: String! @tag(name: "public")

    """
    Optional description providing additional context about the purpose of the access token.
    """
    description: String @tag(name: "public")

    """
    List of permissions assigned to the access token.
    Available permissions can be retrieved via the
    'Organization.availableOrganizationAccessTokenPermissionGroups' field.
    """
    permissions: [String!]! @tag(name: "public")

    """
    Resources on which the permissions should be granted (e.g., project, target, service, or app deployments).
    Permissions are inherited by sub-resources.
    """
    resources: ResourceAssignmentInput! @tag(name: "public")
  }

  """
  Result returned after attempting to create an organization access token.
  """
  type CreateOrganizationAccessTokenResult {
    """
    Indicates a successful creation.
    """
    ok: CreateOrganizationAccessTokenResultOk @tag(name: "public")

    """
    Contains error information if the creation failed.
    """
    error: CreateOrganizationAccessTokenResultError @tag(name: "public")
  }

  """
  Payload returned on successful organization access token creation.
  """
  type CreateOrganizationAccessTokenResultOk {
    """
    The newly created organization access token.
    """
    createdOrganizationAccessToken: OrganizationAccessToken!

    """
    The private access key corresponding to the new token.
    This value is only returned once at creation time and cannot be retrieved later.
    """
    privateAccessKey: String! @tag(name: "public")
  }

  """
  Payload returned when organization access token creation fails.
  """
  type CreateOrganizationAccessTokenResultError {
    """
    A human-readable message describing the reason for the failure.
    """
    message: String! @tag(name: "public")

    """
    Field-specific validation error details, if any.
    """
    details: CreateOrganizationAccessTokenResultErrorDetails @tag(name: "public")
  }

  """
  Field-level validation error details for organization access token creation.
  """
  type CreateOrganizationAccessTokenResultErrorDetails {
    """
    Validation error message related to the provided title.
    """
    title: String @tag(name: "public")

    """
    Validation error message related to the provided description.
    """
    description: String @tag(name: "public")
  }

  """
  Interface representing a generic access token.
  """
  interface AccessToken {
    """
    Unique identifier of the access token.
    """
    id: ID!

    """
    Human-readable title of the access token.
    """
    title: String!

    """
    Optional description providing additional context about the access token.
    """
    description: String

    """
    The first few characters of the access token, useful for display without exposing the full token.
    """
    firstCharacters: String!

    """
    Timestamp indicating when the access token was created.
    """
    createdAt: DateTime!

    """
    A list of resource levels, their assigned resources, and the granted permissions on each resource.
    """
    resolvedResourcePermissionGroups(
      """
      If true, include all permissions and resource groups in the result,
      even those not currently granted.
      """
      includeAll: Boolean! = false
    ): [ResolvedResourcePermissionGroup!]!
  }

  type AccessTokenEdge {
    node: AccessToken!
    cursor: String!
  }

  type AccessTokenConnection {
    pageInfo: PageInfo!
    edges: [AccessTokenEdge!]!
  }

  """
  Organization-scoped access token.
  """
  type OrganizationAccessToken implements AccessToken {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String @tag(name: "public")
    permissions: [String!]! @tag(name: "public")
    resources: ResourceAssignment! @tag(name: "public")
    firstCharacters: String! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")

    """
    A list of resource levels, their assigned resources, and the granted permissions on each resource.
    """
    resolvedResourcePermissionGroups(
      """
      If true, include all permissions and resource groups in the result,
      even those not currently granted.
      """
      includeAll: Boolean! = false
    ): [ResolvedResourcePermissionGroup!]!
  }

  type ProjectAccessTokenEdge {
    node: ProjectAccessToken!
    cursor: String!
  }

  type PersonalAccessTokenConnection {
    pageInfo: PageInfo!
    edges: [PersonalAccessTokenEdge!]!
  }

  type PersonalAccessTokenEdge {
    node: PersonalAccessToken!
    cursor: String!
  }

  type ProjectAccessTokenConnection {
    pageInfo: PageInfo!
    edges: [ProjectAccessTokenEdge!]!
  }

  """
  Project-scoped access token.
  """
  type ProjectAccessToken implements AccessToken {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String @tag(name: "public")
    firstCharacters: String! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")

    """
    A list of resource levels, their assigned resources, and the granted permissions on each resource.
    """
    resolvedResourcePermissionGroups(
      """
      Whether the result should contain all permissions and resource groups, or only granted permissions/resources.
      """
      includeAll: Boolean! = false
    ): [ResolvedResourcePermissionGroup!]!
  }

  type PersonalAccessToken implements AccessToken {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String @tag(name: "public")
    firstCharacters: String! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")

    """
    A list of the resource levels, the assigned resources and the granted permissions on each of those resources.
    """
    resolvedResourcePermissionGroups(
      """
      If true, include all permissions and resource groups in the result,
      even those not currently granted.
      """
      includeAll: Boolean! = false
    ): [ResolvedResourcePermissionGroup!]!
  }

  """
  Input for deleting an access token.
  """
  input DeleteAccessTokenInput {
    """
    Reference to the access token that should be deleted.
    """
    accessToken: AccessTokenReference! @tag(name: "public")
  }

  """
  Reference input for identifying an access token.
  """
  input AccessTokenReference @oneOf @tag(name: "public") {
    """
    Select an access token by its unique ID.
    """
    byId: ID @tag(name: "public")
  }

  """
  Result returned after attempting to delete an access token.
  """
  type DeleteAccessTokenResult {
    """
    Indicates a successful deletion.
    """
    ok: DeleteAccessTokenResultOk @tag(name: "public")

    """
    Contains error information if the deletion failed.
    """
    error: DeleteAccessTokenResultError @tag(name: "public")
  }

  """
  Payload returned on successful access token deletion.
  """
  type DeleteAccessTokenResultOk {
    """
    The unique ID of the access token that was deleted.
    """
    deletedAccessTokenId: ID! @tag(name: "public")
  }

  """
  Payload returned when access token deletion fails.
  """
  type DeleteAccessTokenResultError {
    """
    A human-readable message describing the reason for the failure.
    """
    message: String! @tag(name: "public")
  }

  type UpdateOrganizationSlugResult {
    ok: UpdateOrganizationSlugOk
    error: UpdateOrganizationSlugError
  }

  type UpdateOrganizationSlugOk {
    updatedOrganizationPayload: OrganizationPayload!
  }

  type UpdateOrganizationSlugError implements Error {
    message: String!
  }

  type CreateOrganizationOk {
    createdOrganizationPayload: OrganizationPayload!
  }

  type CreateOrganizationInputErrors {
    slug: String
  }

  type CreateOrganizationError implements Error {
    message: String!
    inputErrors: CreateOrganizationInputErrors!
  }

  """
  @oneOf
  """
  type LeaveOrganizationResult {
    ok: LeaveOrganizationOk
    error: LeaveOrganizationError
  }

  type LeaveOrganizationOk {
    organizationId: ID!
  }

  type LeaveOrganizationError implements Error {
    message: String!
  }

  input OrganizationTransferRequestSelector {
    organizationSlug: String!
    code: String!
  }

  input AnswerOrganizationTransferRequestInput {
    organizationSlug: String!
    accept: Boolean!
    code: String!
  }

  """
  @oneOf
  """
  type AnswerOrganizationTransferRequestResult {
    ok: AnswerOrganizationTransferRequestOk
    error: AnswerOrganizationTransferRequestError
  }

  type AnswerOrganizationTransferRequestOk {
    accepted: Boolean!
  }

  type AnswerOrganizationTransferRequestError implements Error {
    message: String!
  }

  """
  @oneOf
  """
  type RequestOrganizationTransferResult {
    ok: RequestOrganizationTransferOk
    error: RequestOrganizationTransferError
  }

  type RequestOrganizationTransferOk {
    email: String!
    code: String!
  }

  type RequestOrganizationTransferError implements Error {
    message: String!
  }

  """
  @oneOf
  """
  type CreateOrganizationResult {
    ok: CreateOrganizationOk
    error: CreateOrganizationError
  }

  input OrganizationSelectorInput {
    organizationSlug: String! @tag(name: "public")
  }

  type OrganizationSelector {
    organizationSlug: String!
  }

  input OrganizationMemberInput {
    organizationSlug: String!
    userId: ID!
  }

  input RequestOrganizationTransferInput {
    organizationSlug: String!
    userId: ID!
  }

  input CreateOrganizationInput {
    slug: String!
  }

  input UpdateOrganizationSlugInput {
    organizationSlug: String!
    slug: String!
  }

  input InviteToOrganizationByEmailInput {
    organization: OrganizationReferenceInput! @tag(name: "public")
    email: String! @tag(name: "public")
    memberRoleId: ID @tag(name: "public")
  }

  input DeleteOrganizationInvitationInput {
    organization: OrganizationReferenceInput! @tag(name: "public")
    email: String! @tag(name: "public")
  }

  type InviteToOrganizationByEmailResultError {
    message: String! @tag(name: "public")
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: InviteToOrganizationByEmailInputErrors! @tag(name: "public")
  }

  type InviteToOrganizationByEmailResultOk {
    createdOrganizationInvitation: OrganizationInvitation! @tag(name: "public")
  }

  type InviteToOrganizationByEmailInputErrors {
    email: String @tag(name: "public") @tag(name: "public")
  }

  """
  @oneOf
  """
  type InviteToOrganizationByEmailResult {
    ok: InviteToOrganizationByEmailResultOk @tag(name: "public")
    error: InviteToOrganizationByEmailResultError @tag(name: "public")
  }

  type OrganizationTransfer {
    organization: Organization!
  }

  type MemberRoleEdge {
    node: MemberRole! @tag(name: "public")
    cursor: String!
  }

  type MemberRoleConnection {
    edges: [MemberRoleEdge!]! @tag(name: "public")
    pageInfo: PageInfo!
  }

  type Organization {
    """
    Unique UUID of the organization
    """
    id: ID! @tag(name: "public")
    """
    The slug of the organization.
    """
    slug: String! @tag(name: "public")
    cleanId: ID! @deprecated(reason: "Use the 'slug' field instead.")
    name: String! @deprecated(reason: "Use the 'slug' field instead.")
    owner: Member! @tag(name: "public")
    me: Member!
    members(first: Int @tag(name: "public"), after: String @tag(name: "public")): MemberConnection!
      @tag(name: "public")
    invitations(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
    ): OrganizationInvitationConnection @tag(name: "public")
    getStarted: OrganizationGetStarted!
    memberRoles(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
    ): MemberRoleConnection @tag(name: "public")
    """
    Whether the viewer should be able to access the settings page within the app
    """
    viewerCanAccessSettings: Boolean!
    """
    Whether the viewer can modify the organization slug
    """
    viewerCanModifySlug: Boolean!
    """
    Whether the viewer can transfer ownership of the organization
    """
    viewerCanTransferOwnership: Boolean!
    """
    Whether the viewer can delete the organization
    """
    viewerCanDelete: Boolean!
    """
    Whether the viewer can see the members within the organization
    """
    viewerCanSeeMembers: Boolean!
    """
    Whether the viewer can manage member invites
    """
    viewerCanManageInvitations: Boolean!
    """
    Whether the viewer can assign roles to users
    """
    viewerCanAssignUserRoles: Boolean!
    """
    Whether the viewer can modify roles of members within the organization
    """
    viewerCanManageRoles: Boolean!
    """
    The organization's audit logs. This field is only available to members with the Admin role.
    """
    viewerCanExportAuditLogs: Boolean!
    """
    List of available permission groups that can be assigned to users.
    """
    availableMemberPermissionGroups: [PermissionGroup!]! @tag(name: "public")
    """
    List of available permission groups that can be assigned to organization access tokens.
    """
    availableOrganizationAccessTokenPermissionGroups: [PermissionGroup!]! @tag(name: "public")
    """
    Whether the viewer can manage access tokens.
    """
    viewerCanManageAccessTokens: Boolean!
    """
    Whether the viewer can manage personal access tokens.
    """
    viewerCanManagePersonalAccessTokens: Boolean!
    """
    Paginated list of all organization scoped access tokens.
    """
    accessTokens(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
    ): OrganizationAccessTokenConnection! @tag(name: "public")
    """
    Retrieve a organization scoped access token by it's id.
    """
    accessToken(id: ID! @tag(name: "public")): OrganizationAccessToken @tag(name: "public")

    """
    Retrieve a list of all access tokens within the organization.
    This includes organization, project and personal scoped access tokens.
    """
    allAccessTokens(first: Int, after: String): AccessTokenConnection!
    """
    Retrieve a access token within the organization by its ID.
    """
    accessTokenById(id: ID!): AccessToken
  }

  type OrganizationAccessTokenEdge {
    node: OrganizationAccessToken! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type OrganizationAccessTokenConnection {
    pageInfo: PageInfo! @tag(name: "public")
    edges: [OrganizationAccessTokenEdge!]! @tag(name: "public")
  }

  type OrganizationConnection {
    nodes: [Organization!]!
    total: Int!
  }

  type OrganizationInvitationEdge {
    node: OrganizationInvitation! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type OrganizationInvitationConnection {
    edges: [OrganizationInvitationEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type OrganizationInvitation {
    id: ID! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")
    expiresAt: DateTime! @tag(name: "public")
    email: String! @tag(name: "public")
    code: String!
    role: MemberRole! @tag(name: "public")
  }

  type OrganizationInvitationError {
    message: String!
  }

  type OrganizationInvitationPayload {
    name: String!
  }

  union JoinOrganizationPayload = OrganizationInvitationError | OrganizationPayload

  union OrganizationByInviteCodePayload =
    | OrganizationInvitationError
    | OrganizationInvitationPayload

  type OrganizationPayload {
    selector: OrganizationSelector!
    organization: Organization!
  }

  type OrganizationGetStarted {
    creatingProject: Boolean!
    publishingSchema: Boolean!
    checkingSchema: Boolean!
    invitingMembers: Boolean!
    enablingUsageBasedBreakingChanges: Boolean!
  }

  """
  @oneOf
  """
  type DeleteOrganizationInvitationResult {
    ok: DeleteOrganizationInvitationResultOk @tag(name: "public")
    error: DeleteOrganizationInvitationResultError @tag(name: "public")
  }

  type DeleteOrganizationInvitationResultOk {
    deletedOrganizationInvitationId: ID! @tag(name: "public")
  }

  type DeleteOrganizationInvitationResultError {
    message: String! @tag(name: "public")
  }

  type MemberRole {
    id: ID! @tag(name: "public")
    name: String! @tag(name: "public")
    description: String! @tag(name: "public")
    """
    Whether the role is a built-in role. Built-in roles cannot be deleted or modified.
    """
    isLocked: Boolean! @tag(name: "public")
    """
    Whether the role can be deleted (based on current user's permissions)
    """
    canDelete: Boolean!
    """
    Whether the role can be updated (based on current user's permissions)
    """
    canUpdate: Boolean!
    """
    Whether the role can be used to invite new members (based on current user's permissions)
    """
    canInvite: Boolean!
    """
    Amount of users within the organization that have this role assigned.
    """
    membersCount: Int!
    """
    List of permissions attached to this member role.
    """
    permissions: [String!]! @tag(name: "public")
  }

  input CreateMemberRoleInput {
    """
    The organization in which the member role should be created.
    """
    organization: OrganizationReferenceInput! @tag(name: "public")
    """
    The name of the member role (must be unique).
    """
    name: String! @tag(name: "public")
    """
    A description describing the purpose of the member role.
    """
    description: String! @tag(name: "public")
    """
    A list of available permissions can be retrieved via the 'Organization.availableMemberPermissionGroups' field.
    """
    selectedPermissions: [String!]! @tag(name: "public")
  }

  type CreateMemberRoleResultOk {
    updatedOrganization: Organization! @tag(name: "public")
    createdMemberRole: MemberRole! @tag(name: "public")
  }

  type CreateMemberRoleInputErrors {
    name: String @tag(name: "public")
    description: String @tag(name: "public")
  }

  type CreateMemberRoleResultError {
    message: String! @tag(name: "public")
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: CreateMemberRoleInputErrors @tag(name: "public")
  }

  """
  @oneOf
  """
  type CreateMemberRoleResult {
    ok: CreateMemberRoleResultOk @tag(name: "public")
    error: CreateMemberRoleResultError @tag(name: "public")
  }

  input UpdateMemberRoleInput {
    """
    The member role that should be udpated.
    """
    memberRole: MemberRoleReferenceInput! @tag(name: "public")
    name: String! @tag(name: "public")
    description: String! @tag(name: "public")
    selectedPermissions: [String!]! @tag(name: "public")
  }

  type UpdateMemberRoleResultOk {
    updatedRole: MemberRole! @tag(name: "public")
  }

  type UpdateMemberRoleInputErrors {
    name: String @tag(name: "public")
    description: String @tag(name: "public")
  }

  type UpdateMemberRoleResultError {
    message: String! @tag(name: "public")
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: UpdateMemberRoleInputErrors @tag(name: "public")
  }

  input MemberRoleReferenceInput @oneOf {
    byId: ID @tag(name: "public")
  }

  input MemberReferenceInput @oneOf {
    byId: ID @tag(name: "public")
  }

  """
  @oneOf
  """
  type UpdateMemberRoleResult {
    ok: UpdateMemberRoleResultOk @tag(name: "public")
    error: UpdateMemberRoleResultError @tag(name: "public")
  }

  input DeleteMemberRoleInput {
    memberRole: MemberRoleReferenceInput! @tag(name: "public")
  }

  type DeleteMemberRoleResultOk {
    updatedOrganization: Organization! @tag(name: "public")
    deletedMemberRoleId: ID! @tag(name: "public")
  }

  type DeleteMemberRoleResultError {
    message: String! @tag(name: "public")
  }

  """
  @oneOf
  """
  type DeleteMemberRoleResult {
    ok: DeleteMemberRoleResultOk @tag(name: "public")
    error: DeleteMemberRoleResultError @tag(name: "public")
  }

  input AssignMemberRoleInput {
    organization: OrganizationReferenceInput! @tag(name: "public")
    memberRole: MemberRoleReferenceInput! @tag(name: "public")
    member: MemberReferenceInput! @tag(name: "public")
    resources: ResourceAssignmentInput! @tag(name: "public")
  }

  type AssignMemberRoleResultOk {
    updatedMember: Member! @tag(name: "public")
    previousMemberRole: MemberRole @tag(name: "public")
  }

  type AssignMemberRoleResultError {
    message: String! @tag(name: "public")
  }

  """
  @oneOf
  """
  type AssignMemberRoleResult {
    ok: AssignMemberRoleResultOk @tag(name: "public")
    error: AssignMemberRoleResultError @tag(name: "public")
  }

  type Member {
    id: ID!
    user: User! @tag(name: "public")
    isOwner: Boolean! @tag(name: "public")
    canLeaveOrganization: Boolean!
    role: MemberRole! @tag(name: "public")
    resourceAssignment: ResourceAssignment! @tag(name: "public")
    """
    Whether the viewer can remove this member from the organization.
    """
    viewerCanRemove: Boolean!
  }

  enum ResourceAssignmentModeType {
    """
    Apply to all subresouces of the resource.
    """
    ALL @tag(name: "public")
    """
    Apply to specific subresouces of the resource.
    """
    GRANULAR @tag(name: "public")
  }

  type MemberConnection {
    edges: [MemberEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type MemberEdge {
    cursor: String! @tag(name: "public")
    node: Member! @tag(name: "public")
  }

  input AppDeploymentResourceAssignmentInput {
    appDeployment: String! @tag(name: "public")
  }

  input TargetAppDeploymentsResourceAssignmentInput {
    """
    Whether the permissions should apply for all app deployments within the target.
    """
    mode: ResourceAssignmentModeType! @tag(name: "public")
    """
    Specific app deployments within the target for which the permissions should be applied.
    """
    appDeployments: [AppDeploymentResourceAssignmentInput!] @tag(name: "public")
  }

  input ServiceResourceAssignmentInput {
    serviceName: String! @tag(name: "public")
  }

  input TargetServicesResourceAssignmentInput {
    """
    Whether the permissions should apply for all services within the target or only selected ones.
    """
    mode: ResourceAssignmentModeType! @tag(name: "public")
    """
    Specific services within the target for which the permissions should be applied.
    """
    services: [ServiceResourceAssignmentInput!] @tag(name: "public")
  }

  input TargetResourceAssignmentInput {
    targetId: ID! @tag(name: "public")
    services: TargetServicesResourceAssignmentInput! @tag(name: "public")
    appDeployments: TargetAppDeploymentsResourceAssignmentInput! @tag(name: "public")
  }

  input ProjectTargetsResourceAssignmentInput {
    """
    Whether the permissions should apply for all targets within the project or only selected ones.
    """
    mode: ResourceAssignmentModeType! @tag(name: "public")
    """
    Specific targets within the projects for which the permissions should be applied.
    """
    targets: [TargetResourceAssignmentInput!] @tag(name: "public")
  }

  input ProjectResourceAssignmentInput {
    projectId: ID! @tag(name: "public")
    targets: ProjectTargetsResourceAssignmentInput! @tag(name: "public")
  }

  input ResourceAssignmentInput {
    """
    Whether the permissions should apply for all projects within the organization or only selected ones.
    """
    mode: ResourceAssignmentModeType! @tag(name: "public")
    """
    Specific projects within the organization for which the permissions should be applied.
    """
    projects: [ProjectResourceAssignmentInput!] @tag(name: "public")
  }

  type TargetServicesResourceAssignment {
    mode: ResourceAssignmentModeType! @tag(name: "public")
    services: [String!] @tag(name: "public")
  }

  type TargetAppDeploymentsResourceAssignment {
    mode: ResourceAssignmentModeType! @tag(name: "public")
    appDeployments: [String!] @tag(name: "public")
  }

  type TargetResouceAssignment {
    targetId: ID! @tag(name: "public")
    target: Target! @tag(name: "public")
    services: TargetServicesResourceAssignment! @tag(name: "public")
    appDeployments: TargetAppDeploymentsResourceAssignment! @tag(name: "public")
  }

  type ProjectTargetsResourceAssignment {
    mode: ResourceAssignmentModeType! @tag(name: "public")
    targets: [TargetResouceAssignment!] @tag(name: "public")
  }

  type ProjectResourceAssignment {
    projectId: ID! @tag(name: "public")
    project: Project! @tag(name: "public")
    targets: ProjectTargetsResourceAssignment! @tag(name: "public")
  }

  type ResourceAssignment {
    mode: ResourceAssignmentModeType! @tag(name: "public")
    projects: [ProjectResourceAssignment!] @tag(name: "public")
  }

  extend type Project {
    """
    Paginated list of access tokens issued for the project.
    """
    accessTokens(first: Int, after: String): ProjectAccessTokenConnection!
    """
    Access token for project.
    """
    accessToken(id: ID!): ProjectAccessToken
    """
    Permissions that the viewer can assign to project access tokens.
    """
    availableProjectAccessTokenPermissionGroups: [PermissionGroup!]!
    """
    Whether the user can manage the access tokens in this project.
    """
    viewerCanManageProjectAccessTokens: Boolean!
  }

  extend type Member {
    availablePersonalAccessTokenPermissionGroups: [PermissionGroup!]!
    """
    Paginated list of access tokens issued for the project.
    """
    accessTokens(first: Int, after: String): PersonalAccessTokenConnection!
    """
    Access token for project.
    """
    accessToken(id: ID!): PersonalAccessToken
  }

  """
  Represents a specific permission and whether it is currently granted to the user or actor.
  """
  type ResolvedPermission {
    """
    The permission definition, indicating the action or capability being checked.
    """
    permission: Permission!
    """
    Indicates whether this permission is currently granted.
    """
    isGranted: Boolean!
  }

  """
  A logical grouping of related permissions, often displayed together in a UI section.
  """
  type ResolvedPermissionsGroup {
    """
    Human-readable title of the permission group (e.g. "Schema Registry" or "Members").
    """
    title: String!
    """
    List of resolved permissions that belong to this group.
    """
    permissions: [ResolvedPermission!]!
  }

  """
  Represents a group of permissions associated with a specific resource level
  (e.g., organization, project, or item).
  """
  type ResolvedResourcePermissionGroup {
    """
    The resource level this permission group applies to (e.g., ORGANIZATION, PROJECT).
    """
    level: PermissionLevelType!
    """
    The resource identifiers that are currently valid for this permission group.
    Some examples:
    - **Organization.** "the-guild"
    - **Project** "the-guild/graphql-hive"
    - **Target** "the-guild/graphql-hive/production"
    - **Service** "the-guild/graphql-hive/production/service/users"
    - **App Deployment** "the-guild/graphql-hive/production/appDeployment/production"

    These ids can also contain wildcards, e.g. "the-guild/graphql-hive/*", to reference all targets in a project.
    """
    resolvedResourceIds: [String!]
    """
    Human-readable title describing this permission group.
    """
    title: String!
    """
    The resolved permission groups under this resource level.
    """
    resolvedPermissionGroups: [ResolvedPermissionsGroup!]!
  }

  """
  Represents the currently authorized actor (user, service, etc.)
  and its associated permissions.
  """
  type WhoAmI {
    """
    Human-readable title identifying the type of actor
    (e.g., "User", "Access Token").
    """
    title: String!
    """
    A structured view of permissions that the authorized actor can perform,
    optionally including all possible permissions for context.
    """
    resolvedPermissions(
      """
      If true, include all known permissions in the response,
      even those not currently granted.
      """
      includeAll: Boolean! = false
    ): [ResolvedResourcePermissionGroup!]!
  }

  extend type Query {
    """
    Returns information about the currently authorized actor,
    including permission details.
    """
    whoAmI: WhoAmI
  }
`;
