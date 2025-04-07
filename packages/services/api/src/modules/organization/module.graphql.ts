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
      input: InviteToOrganizationByEmailInput!
    ): InviteToOrganizationByEmailResult!
    deleteOrganizationInvitation(
      input: DeleteOrganizationInvitationInput!
    ): DeleteOrganizationInvitationResult!
    updateOrganizationSlug(input: UpdateOrganizationSlugInput!): UpdateOrganizationSlugResult!
    requestOrganizationTransfer(
      input: RequestOrganizationTransferInput!
    ): RequestOrganizationTransferResult!
    answerOrganizationTransferRequest(
      input: AnswerOrganizationTransferRequestInput!
    ): AnswerOrganizationTransferRequestResult!
    createMemberRole(input: CreateMemberRoleInput!): CreateMemberRoleResult!
    updateMemberRole(input: UpdateMemberRoleInput!): UpdateMemberRoleResult!
    deleteMemberRole(input: DeleteMemberRoleInput!): DeleteMemberRoleResult!
    assignMemberRole(input: AssignMemberRoleInput!): AssignMemberRoleResult!
    createOrganizationAccessToken(
      input: CreateOrganizationAccessTokenInput! @tag(name: "public")
    ): CreateOrganizationAccessTokenResult! @tag(name: "public")
    deleteOrganizationAccessToken(
      input: DeleteOrganizationAccessTokenInput! @tag(name: "public")
    ): DeleteOrganizationAccessTokenResult! @tag(name: "public")
  }

  input OrganizationReferenceInput @oneOf {
    bySelector: OrganizationSelectorInput @tag(name: "public")
    byId: ID @tag(name: "public")
  }

  input CreateOrganizationAccessTokenInput {
    organization: OrganizationReferenceInput! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String @tag(name: "public")
    permissions: [String!]! @tag(name: "public")
    resources: ResourceAssignmentInput! @tag(name: "public")
  }

  type CreateOrganizationAccessTokenResult {
    ok: CreateOrganizationAccessTokenResultOk @tag(name: "public")
    error: CreateOrganizationAccessTokenResultError @tag(name: "public")
  }

  type CreateOrganizationAccessTokenResultOk {
    createdOrganizationAccessToken: OrganizationAccessToken!
    privateAccessKey: String! @tag(name: "public")
  }

  type CreateOrganizationAccessTokenResultError {
    message: String! @tag(name: "public")
    details: CreateOrganizationAccessTokenResultErrorDetails @tag(name: "public")
  }

  type CreateOrganizationAccessTokenResultErrorDetails {
    """
    Error message for the input title.
    """
    title: String @tag(name: "public")
    """
    Error message for the input description.
    """
    description: String @tag(name: "public")
  }

  type OrganizationAccessToken {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String @tag(name: "public")
    permissions: [String!]! @tag(name: "public")
    resources: ResourceAssignment! @tag(name: "public")
    firstCharacters: String! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")
  }

  input DeleteOrganizationAccessTokenInput {
    organizationAccessToken: OrganizationAccessTokenReference! @tag(name: "public")
  }

  input OrganizationAccessTokenReference @oneOf @tag(name: "public") {
    byId: ID @tag(name: "public")
  }

  type DeleteOrganizationAccessTokenResult {
    ok: DeleteOrganizationAccessTokenResultOk @tag(name: "public")
    error: DeleteOrganizationAccessTokenResultError @tag(name: "public")
  }

  type DeleteOrganizationAccessTokenResultOk {
    deletedOrganizationAccessTokenId: ID! @tag(name: "public")
  }

  type DeleteOrganizationAccessTokenResultError {
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
    organizationSlug: String!
    roleId: ID
    email: String!
  }

  input DeleteOrganizationInvitationInput {
    organizationSlug: String!
    email: String!
  }

  type InviteToOrganizationByEmailError implements Error {
    message: String!
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: InviteToOrganizationByEmailInputErrors!
  }

  type InviteToOrganizationByEmailInputErrors {
    email: String
  }

  """
  @oneOf
  """
  type InviteToOrganizationByEmailResult {
    ok: OrganizationInvitation
    error: InviteToOrganizationByEmailError
  }

  type OrganizationTransfer {
    organization: Organization!
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
    owner: Member!
    me: Member!
    members: MemberConnection
    invitations: OrganizationInvitationConnection
    getStarted: OrganizationGetStarted!
    memberRoles: [MemberRole!]
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
    availableMemberPermissionGroups: [PermissionGroup!]!
    """
    List of available permission groups that can be assigned to organization access tokens.
    """
    availableOrganizationPermissionGroups: [PermissionGroup!]!
    """
    Whether the viewer can manage access tokens.
    """
    viewerCanManageAccessTokens: Boolean!
    """
    Paginated organization access tokens.
    """
    accessTokens(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
    ): OrganizationAccessTokenConnection! @tag(name: "public")
    """
    Get organization access token by id.
    """
    accessToken(id: ID! @tag(name: "public")): OrganizationAccessToken @tag(name: "public")
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

  type OrganizationInvitationConnection {
    nodes: [OrganizationInvitation!]!
    total: Int!
  }

  type OrganizationInvitation {
    id: ID!
    createdAt: DateTime!
    expiresAt: DateTime!
    email: String!
    code: String!
    role: MemberRole!
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
    ok: OrganizationInvitation
    error: DeleteOrganizationInvitationError
  }

  type DeleteOrganizationInvitationError implements Error {
    message: String!
  }

  type MemberRole {
    id: ID!
    name: String!
    description: String!
    """
    Whether the role is a built-in role. Built-in roles cannot be deleted or modified.
    """
    locked: Boolean!
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
    permissions: [String!]!
  }

  input CreateMemberRoleInput {
    organizationSlug: String!
    name: String!
    description: String!
    selectedPermissions: [String!]!
  }

  type CreateMemberRoleOk {
    updatedOrganization: Organization!
  }

  type CreateMemberRoleInputErrors {
    name: String
    description: String
  }

  type CreateMemberRoleError implements Error {
    message: String!
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: CreateMemberRoleInputErrors
  }

  """
  @oneOf
  """
  type CreateMemberRoleResult {
    ok: CreateMemberRoleOk
    error: CreateMemberRoleError
  }

  input UpdateMemberRoleInput {
    organizationSlug: String!
    roleId: ID!
    name: String!
    description: String!
    selectedPermissions: [String!]!
  }

  type UpdateMemberRoleOk {
    updatedRole: MemberRole!
  }

  type UpdateMemberRoleInputErrors {
    name: String
    description: String
  }

  type UpdateMemberRoleError implements Error {
    message: String!
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: UpdateMemberRoleInputErrors
  }

  """
  @oneOf
  """
  type UpdateMemberRoleResult {
    ok: UpdateMemberRoleOk
    error: UpdateMemberRoleError
  }

  input DeleteMemberRoleInput {
    organizationSlug: String!
    roleId: ID!
  }

  type DeleteMemberRoleOk {
    updatedOrganization: Organization!
  }

  type DeleteMemberRoleError implements Error {
    message: String!
  }

  """
  @oneOf
  """
  type DeleteMemberRoleResult {
    ok: DeleteMemberRoleOk
    error: DeleteMemberRoleError
  }

  input AssignMemberRoleInput {
    organizationSlug: String!
    userId: ID!
    roleId: ID!
    resources: ResourceAssignmentInput!
  }

  type AssignMemberRoleOk {
    updatedMember: Member!
    previousMemberRole: MemberRole
  }

  type AssignMemberRoleError implements Error {
    message: String!
  }

  """
  @oneOf
  """
  type AssignMemberRoleResult {
    ok: AssignMemberRoleOk
    error: AssignMemberRoleError
  }

  type Member {
    id: ID!
    user: User!
    isOwner: Boolean!
    canLeaveOrganization: Boolean!
    role: MemberRole!
    resourceAssignment: ResourceAssignment!
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
    nodes: [Member!]!
    total: Int!
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
`;
