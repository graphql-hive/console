import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    organization(selector: OrganizationSelectorInput!): OrganizationPayload
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
    organizationSlug: String!
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
    id: ID!
    slug: String!
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
    resources: MemberResourceAssignmentInput!
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
    resourceAssignment: MemberResourceAssignment!
    """
    Whether the viewer can remove this member from the organization.
    """
    viewerCanRemove: Boolean!
  }

  type MemberConnection {
    nodes: [Member!]!
    total: Int!
  }

  input MemberAppDeploymentAssignmentInput {
    appDeployment: String!
  }

  """
  @oneOf
  """
  input MemberTargetAppDeploymentsAssignmentInput {
    """
    Whether the permissions should apply for all app deployments within the target.
    """
    allAppDeployments: Boolean
    """
    Specific app deployments within the target for which the permissions should be applied.
    """
    appDeployments: [MemberAppDeploymentAssignmentInput!]
  }

  input MemberServiceAssignmentInput {
    serviceName: String!
  }

  """
  @oneOf
  """
  input MemberTargetServicesAssignmentInput {
    """
    Whether the permissions should apply for all services within the target.
    """
    allServices: Boolean
    """
    Specific services within the target for which the permissions should be applied.
    """
    services: MemberServiceAssignmentInput
  }

  input MemberTargetAssignmentInput {
    targetId: ID!
    services: MemberTargetServicesAssignmentInput!
    appDeployments: MemberTargetAppDeploymentsAssignmentInput!
  }

  """
  @oneOf
  """
  input MemberProjectTargetsAssignmentInput {
    """
    Whether the permissions should apply for all targets within the project.
    """
    allTargets: Boolean
    """
    Specific targets within the projects for which the permissions should be applied.
    """
    targets: [MemberTargetAssignmentInput!]
  }

  input MemberProjectAssignmentInput {
    projectId: ID!
    targets: MemberProjectTargetsAssignmentInput!
  }

  """
  @oneOf
  """
  input MemberResourceAssignmentInput {
    """
    Whether the permissions should apply for all projects within the organization.
    """
    allProjects: Boolean
    """
    Specific projects within the organization for which the permissions should be applied.
    """
    projects: [MemberProjectAssignmentInput!]
  }

  """
  @oneOf
  """
  type MemberTargetServicesAssignment {
    allServices: Boolean
    services: [String!]
  }

  """
  @oneOf
  """
  type MemberTargetAppDeploymentAssignment {
    allAppDeployments: Boolean
    appDeployments: [String!]
  }

  type MemberTargetAssignment {
    targetId: ID!
    target: Target!
    services: MemberTargetServicesAssignment!
    appDeployments: MemberTargetAppDeploymentAssignment!
  }

  """
  @oneOf
  """
  type MemberProjectTargetsAssignment {
    allTargets: Boolean
    targets: [MemberTargetAssignment!]
  }

  type MemberProjectAssignment {
    projectId: ID!
    project: Project!
    targets: MemberProjectTargetsAssignment!
  }

  """
  @oneOf
  """
  type MemberResourceAssignment {
    allProjects: Boolean
    projects: [MemberProjectAssignment!]
  }
`;
