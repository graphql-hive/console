import { graphql } from 'testkit/gql';
import { ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { history } from '../../../testkit/emails';
import { initSeed } from '../../../testkit/seed';

test.concurrent('owner of an organization should have all scopes', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { organization } = await createOrg();

  expect(organization.owner.role.permissions).toMatchInlineSnapshot(`
    [
      organization:describe,
      support:manageTickets,
      accessToken:modify,
      organization:modifySlug,
      auditLog:export,
      organization:delete,
      member:describe,
      member:modify,
      billing:describe,
      billing:update,
      oidc:modify,
      gitHubIntegration:modify,
      slackIntegration:modify,
      project:create,
      schemaLinting:modifyOrganizationRules,
      personalAccessToken:modify,
      project:describe,
      project:delete,
      project:modifySettings,
      projectAccessToken:modify,
      schemaLinting:modifyProjectRules,
      target:create,
      alert:modify,
      target:delete,
      target:modifySettings,
      targetAccessToken:modify,
      cdnAccessToken:modify,
      laboratory:describe,
      laboratory:modify,
      laboratory:modifyPreflightScript,
      schemaProposal:describe,
      schemaProposal:modify,
      schema:compose,
      usage:report,
      traces:report,
      schemaCheck:approve,
      schemaCheck:create,
      schemaVersion:publish,
      schemaVersion:deleteService,
      appDeployment:create,
      appDeployment:publish,
      appDeployment:retire,
    ]
  `);
});

test.concurrent('invited member should have basic scopes (Viewer role)', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember } = await createOrg();
  const { member } = await inviteAndJoinMember();

  expect(member.role.permissions).toMatchInlineSnapshot(`
    [
      organization:describe,
      support:manageTickets,
      project:describe,
      laboratory:describe,
    ]
  `);
});

test.concurrent(
  'granting no permissions is equal to setting read-only access for the organization',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { inviteAndJoinMember } = await createOrg();
    const { createMemberRole } = await inviteAndJoinMember();

    const readOnlyRole = await createMemberRole([]);
    expect(readOnlyRole.permissions).toMatchInlineSnapshot(`
      [
        organization:describe,
      ]
    `);
  },
);

test.concurrent('cannot delete a role with members', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember } = await createOrg();
  const { createMemberRole, deleteMemberRole, assignMemberRole, member } =
    await inviteAndJoinMember();
  const { member: viewerRoleMember } = await inviteAndJoinMember();

  const membersManagerRole = await createMemberRole([]);
  const readOnlyRole = await createMemberRole([]);
  await assignMemberRole({
    roleId: membersManagerRole.id,
    userId: member.user.id,
  });
  await assignMemberRole({
    roleId: readOnlyRole.id,
    userId: viewerRoleMember.user.id,
  });

  // delete the role as the owner
  await expect(deleteMemberRole(readOnlyRole.id)).rejects.toThrowError(
    'Cannot delete a role with members',
  );
});

test.concurrent('email invitation', async ({ expect }) => {
  const seed = initSeed();
  const { createOrg } = await seed.createOwner();
  const { inviteMember } = await createOrg();

  const inviteEmail = seed.generateEmail();
  const invitationResult = await inviteMember(inviteEmail);
  const inviteCode = invitationResult.ok?.createdOrganizationInvitation.code;
  expect(inviteCode).toBeDefined();

  const sentEmails = await history();
  expect(sentEmails).toContainEqual(expect.objectContaining({ to: inviteEmail }));
});

test.concurrent('can not invite with role not existing in organization', async ({ expect }) => {
  const seed = initSeed();
  const owner1 = await seed.createOwner();
  const org1 = await owner1.createOrg();
  const owner2 = await seed.createOwner();
  const org2 = await owner2.createOrg();
  // no idea why the createMemberRole functionality is "hidden" in the tests SDK and requires to invite a user first to get to :D
  const org2Members = await org2.inviteAndJoinMember();
  const org2Role = await org2Members.createMemberRole(['organization:describe']);

  const result = await org1.inviteMember(undefined, undefined, org2Role.id);
  expect(result).toEqual({
    error: {
      message: 'The provided member role does not exist.',
    },
    ok: null,
  });
});

test.concurrent('invite user with assigned resouces', async ({ expect }) => {
  const seed = initSeed();
  const owner = await seed.createOwner();
  const org = await owner.createOrg();
  const { project: project1 } = await org.createProject();
  // we just create this to make sure it does not show up :)
  const { project: _project2 } = await org.createProject();
  const { project: project3 } = await org.createProject();

  const m = await org.inviteAndJoinMember();
  const role = await m.createMemberRole(['organization:describe', 'project:describe']);

  const member = await org.inviteAndJoinMember(undefined, role.id, {
    mode: ResourceAssignmentModeType.Granular,
    projects: [
      {
        projectId: project1.id,
        targets: { mode: ResourceAssignmentModeType.Granular, targets: [] },
      },
      {
        projectId: project3.id,
        targets: { mode: ResourceAssignmentModeType.Granular, targets: [] },
      },
    ],
  });

  const result = await org.projects(member.memberToken);
  expect(result).toHaveLength(2);
  expect(result[0].id).toEqual(project3.id);
  expect(result[1].id).toEqual(project1.id);
});

test.concurrent(
  'cannot join organization twice using the same invitation code',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { inviteMember, joinMemberUsingCode } = await createOrg();

    // Invite
    const invitationResult = await inviteMember();
    const inviteCode = invitationResult.ok!.createdOrganizationInvitation.code;
    expect(inviteCode).toBeDefined();

    // Join
    const extra = seed.generateEmail();
    const { accessToken: member_access_token } = await seed.authenticate(extra);
    const joinResult = await (
      await joinMemberUsingCode(inviteCode, member_access_token)
    ).expectNoGraphQLErrors();

    expect(joinResult.joinOrganization.__typename).toBe('OrganizationPayload');

    if (joinResult.joinOrganization.__typename !== 'OrganizationPayload') {
      throw new Error('Join failed');
    }

    const other = seed.generateEmail();
    const { accessToken: other_access_token } = await seed.authenticate(other);
    const otherJoinResult = await (
      await joinMemberUsingCode(inviteCode, other_access_token)
    ).expectNoGraphQLErrors();
    expect(otherJoinResult.joinOrganization.__typename).toBe('OrganizationInvitationError');
  },
);

const OrganizationInvitationsQuery = graphql(`
  query OrganizationInvitationsQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      invitations {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);

test.concurrent(
  'Organization.invitations resolves to null without error if user does not have member:modify permission',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { organization, inviteAndJoinMember } = await createOrg();
    const { createMemberRole, assignMemberRole, updateMemberRole, memberToken, member } =
      await inviteAndJoinMember();

    const role = await createMemberRole([]);
    await assignMemberRole({ roleId: role.id, userId: member.id });

    let result = await execute({
      document: OrganizationInvitationsQuery,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: memberToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.organization!.invitations).toEqual(null);

    await updateMemberRole(role, ['member:modify']);

    result = await execute({
      document: OrganizationInvitationsQuery,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: memberToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.organization!.invitations).not.toEqual(null);
  },
);
