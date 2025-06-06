import { ProjectType } from 'testkit/gql/graphql';
import { updateTargetSlug } from '../../../testkit/flow';
import { initSeed } from '../../../testkit/seed';

test.concurrent(`changing a target's slug should result changing its name`, async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, organization } = await createOrg();
  const { project, target } = await createProject(ProjectType.Single);

  const renameResult = await updateTargetSlug(
    {
      target: {
        bySelector: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
        },
      },
      slug: 'bar',
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(renameResult.updateTargetSlug.error).toBeNull();
  expect(renameResult.updateTargetSlug.ok?.target.name).toBe('bar');
  expect(renameResult.updateTargetSlug.ok?.target.slug).toBe('bar');
  expect(renameResult.updateTargetSlug.ok?.selector.targetSlug).toBe('bar');
});

test.concurrent(
  `changing a target's slug to the same value should keep the same slug`,
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { project, target } = await createProject(ProjectType.Single);

    const renameResult = await updateTargetSlug(
      {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        slug: target.slug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(renameResult.updateTargetSlug.error).toBeNull();
    expect(renameResult.updateTargetSlug.ok?.target.name).toBe(target.slug);
    expect(renameResult.updateTargetSlug.ok?.target.slug).toBe(target.slug);
    expect(renameResult.updateTargetSlug.ok?.selector.targetSlug).toBe(target.slug);
  },
);

test.concurrent(
  `changing a target's slug to a taken value should result in an error`,
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { project, targets } = await createProject(ProjectType.Single);

    const firstTarget = targets[0];
    const secondTarget = targets[1];

    expect(firstTarget).toBeDefined();
    expect(secondTarget).toBeDefined();

    const renameResult = await updateTargetSlug(
      {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: firstTarget.slug,
          },
        },
        slug: secondTarget.slug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(renameResult.updateTargetSlug.ok).toBeNull();
    expect(renameResult.updateTargetSlug.error?.message).toBe('Target slug is already taken');
  },
);

test.concurrent(
  `changing a target's slug to a slug taken by another project should be possible`,
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { project, target } = await createProject(ProjectType.Single);
    const { targets, project: project2 } = await createProject(ProjectType.Single);

    const target2 = targets.find(t => t.slug !== target.slug)!;
    expect(target2).toBeDefined();

    const sharedSlug = 'foo';

    await updateTargetSlug(
      {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project2.slug,
            targetSlug: target2.slug,
          },
        },
        slug: sharedSlug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const renameResult = await updateTargetSlug(
      {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        slug: sharedSlug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(renameResult.updateTargetSlug.error).toBeNull();
    expect(renameResult.updateTargetSlug.ok?.target.name).toBe(sharedSlug);
    expect(renameResult.updateTargetSlug.ok?.target.slug).toBe(sharedSlug);
    expect(renameResult.updateTargetSlug.ok?.selector.targetSlug).toBe(sharedSlug);
  },
);

test.concurrent(
  `changing a targets's slug to "view" should result in an error`,
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { project, target } = await createProject(ProjectType.Single);

    const renameResult = await updateTargetSlug(
      {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        slug: 'view',
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(renameResult.updateTargetSlug.ok).toBeNull();
    expect(renameResult.updateTargetSlug.error?.message).toBeDefined();
  },
);

test.concurrent('organization member user can create a target', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { ownerEmail: orgMemberEmail, ownerToken: orgMemberToken } = await initSeed().createOwner();
  const { createProject, inviteMember, joinMemberUsingCode, organization } = await createOrg();
  const inviteMemberResult = await inviteMember(
    orgMemberEmail,
    undefined,
    organization.memberRoles?.edges?.find(edge => edge.node.name === 'Admin')?.node.id,
  );

  if (inviteMemberResult.ok == null) {
    throw new Error('Invite did not succeed' + JSON.stringify(inviteMemberResult));
  }

  const joinMemberUsingCodeResult = await joinMemberUsingCode(
    inviteMemberResult.ok.createdOrganizationInvitation.code,
    orgMemberToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(joinMemberUsingCodeResult.joinOrganization.__typename).toEqual('OrganizationPayload');

  const { createTarget } = await createProject(ProjectType.Single);

  const createTargetResult = await createTarget({
    accessToken: orgMemberToken,
  }).then(r => r.expectNoGraphQLErrors());
  expect(createTargetResult.createTarget.error).toEqual(null);
  expect(createTargetResult.createTarget.ok).not.toBeNull();
});
