import { randomUUID } from 'node:crypto';
import { createOrganization, updateOrganizationSlug } from '../../../testkit/flow';
import { initSeed } from '../../../testkit/seed';

test.concurrent(
  'modifying a slug of an organization to the same value should not change the slug',
  async ({ expect }) => {
    const { ownerToken, createOrg } = await initSeed().createOwner();
    const { organization } = await createOrg();

    const changeOrganizationSlugResult = await updateOrganizationSlug(
      {
        organizationSlug: organization.slug,
        slug: organization.slug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const result =
      changeOrganizationSlugResult.updateOrganizationSlug.ok?.updatedOrganizationPayload;
    expect(changeOrganizationSlugResult.updateOrganizationSlug.error).toBeNull();
    expect(result?.organization.name).toBe(organization.slug);
    expect(result?.organization.slug).toEqual(organization.slug);
    expect(result?.selector.organizationSlug).toEqual(organization.slug);
  },
);

test.concurrent(
  'modifying a clean id of an organization should be possible',
  async ({ expect }) => {
    const { ownerToken, createOrg } = await initSeed().createOwner();
    const { organization } = await createOrg();

    const newSlug = randomUUID();
    const changeOrganizationSlugResult = await updateOrganizationSlug(
      {
        organizationSlug: organization.slug,
        slug: newSlug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const result =
      changeOrganizationSlugResult.updateOrganizationSlug.ok?.updatedOrganizationPayload;
    expect(changeOrganizationSlugResult.updateOrganizationSlug.error).toBeNull();
    expect(result?.organization.name).toBe(newSlug);
    expect(result?.organization.slug).toEqual(newSlug);
    expect(result?.selector.organizationSlug).toEqual(newSlug);
  },
);

test.concurrent(
  'modifying a clean id of an organization should change the organization name',
  async ({ expect }) => {
    const { ownerToken, createOrg } = await initSeed().createOwner();
    const { organization } = await createOrg();

    const newSlug = randomUUID();
    const changeOrganizationSlugResult = await updateOrganizationSlug(
      {
        organizationSlug: organization.slug,
        slug: newSlug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const result =
      changeOrganizationSlugResult.updateOrganizationSlug.ok?.updatedOrganizationPayload;
    expect(changeOrganizationSlugResult.updateOrganizationSlug.error).toBeNull();
    // We keep the organization name the same as the clean id (slug)
    // We do it for legacy reasons, as some queries still use the name.
    expect(result?.organization.name).toBe(newSlug);
    expect(result?.organization.slug).toEqual(newSlug);
    expect(result?.selector.organizationSlug).toEqual(newSlug);
  },
);

test.concurrent(
  'modifying a clean id of an organization to a reserved keyword should fail',
  async ({ expect }) => {
    const { ownerToken, createOrg } = await initSeed().createOwner();
    const { organization } = await createOrg();

    const newSlug = 'graphql';
    const changeOrganizationSlugResult = await updateOrganizationSlug(
      {
        organizationSlug: organization.slug,
        slug: newSlug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(changeOrganizationSlugResult.updateOrganizationSlug.ok).toBeNull();
    expect(changeOrganizationSlugResult.updateOrganizationSlug.error?.message).not.toBeNull();
  },
);

test.concurrent(
  'modifying a clean id of an organization to a taken clean id should fail',
  async ({ expect }) => {
    const { ownerToken, createOrg } = await initSeed().createOwner();
    const { organization } = await createOrg();
    const { organization: anotherOrganization } = await createOrg();

    const changeOrganizationSlugResult = await updateOrganizationSlug(
      {
        organizationSlug: organization.slug,
        slug: anotherOrganization.slug,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(changeOrganizationSlugResult.updateOrganizationSlug.ok).toBeNull();
    expect(changeOrganizationSlugResult.updateOrganizationSlug.error?.message).not.toBeNull();
  },
);

test.concurrent('Mutation.createOrganization: slug with invalid characters', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await createOrganization({ slug: 'Invalid Slug!' }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );

  expect(result.createOrganization.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        slug: Slug can only contain lowercase letters, numbers and dashes,
      },
      message: Please check your input.,
    }
  `);
});

test.concurrent('Mutation.createOrganization: empty slug', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await createOrganization({ slug: '' }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );

  expect(result.createOrganization.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        slug: Organization slug is required,
      },
      message: Please check your input.,
    }
  `);
});

test.concurrent('Mutation.createOrganization: slug too long', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await createOrganization({ slug: 'a'.repeat(51) }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );

  expect(result.createOrganization.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        slug: Slug must be at most 50 characters long,
      },
      message: Please check your input.,
    }
  `);
});

test.concurrent('Mutation.createOrganization: reserved slug', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await createOrganization({ slug: 'graphql' }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );

  expect(result.createOrganization.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        slug: Slug can't be one of the reserved names,
      },
      message: Please check your input.,
    }
  `);
});

test.concurrent(
  'Mutation.updateOrganizationSlug: slug with invalid characters',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { organization } = await createOrg();
    const result = await updateOrganizationSlug(
      { organizationSlug: organization.slug, slug: 'Invalid Slug!' },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(result.updateOrganizationSlug.error).toMatchInlineSnapshot(`
    {
      message: Slug can only contain lowercase letters, numbers and dashes,
    }
  `);
  },
);

test.concurrent('Mutation.updateOrganizationSlug: slug too long', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { organization } = await createOrg();
  const result = await updateOrganizationSlug(
    { organizationSlug: organization.slug, slug: 'a'.repeat(51) },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(result.updateOrganizationSlug.error).toMatchInlineSnapshot(`
    {
      message: Slug must be at most 50 characters long,
    }
  `);
});
