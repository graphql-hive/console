import { graphql } from 'testkit/gql';
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
      project:describe,
      project:delete,
      project:modifySettings,
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
      schemaCheck:approve,
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
  const inviteCode = invitationResult.ok?.code;
  expect(inviteCode).toBeDefined();

  const sentEmails = await history();
  expect(sentEmails).toContainEqual(expect.objectContaining({ to: inviteEmail }));
});

test.concurrent(
  'cannot join organization twice using the same invitation code',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { inviteMember, joinMemberUsingCode } = await createOrg();

    // Invite
    const invitationResult = await inviteMember();
    const inviteCode = invitationResult.ok!.code;
    expect(inviteCode).toBeDefined();

    // Join
    const extra = seed.generateEmail();
    const { access_token: member_access_token } = await seed.authenticate(extra);
    const joinResult = await (
      await joinMemberUsingCode(inviteCode, member_access_token)
    ).expectNoGraphQLErrors();

    expect(joinResult.joinOrganization.__typename).toBe('OrganizationPayload');

    if (joinResult.joinOrganization.__typename !== 'OrganizationPayload') {
      throw new Error('Join failed');
    }

    const other = seed.generateEmail();
    const { access_token: other_access_token } = await seed.authenticate(other);
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
        total
        nodes {
          id
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
