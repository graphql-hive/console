import { updateMe } from 'testkit/flow';
import { initSeed } from 'testkit/seed';

test('can update full name and display name', async () => {
  const { ownerToken } = await initSeed().createOwner();

  const result = await updateMe(
    {
      displayName: 'vegapunk',
      fullName: 'Vincent Vega',
    },
    ownerToken,
  ).then(res => res.expectNoGraphQLErrors());

  expect(result).toEqual({
    updateMe: {
      error: null,
      ok: {
        updatedUser: {
          displayName: 'vegapunk',
          fullName: 'Vincent Vega',
          id: expect.any(String),
        },
      },
    },
  });
});

test.concurrent('Mutation.updateMe: names too short', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await updateMe({ displayName: '', fullName: '' }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );

  expect(result.updateMe.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        displayName: Display name must be at least 2 characters long,
        fullName: Full name must be at least 2 characters long,
      },
      message: Please check your input.,
    }
  `);
});

test.concurrent('Mutation.updateMe: names too long', async ({ expect }) => {
  const { ownerToken } = await initSeed().createOwner();
  const result = await updateMe(
    { displayName: 'a'.repeat(300), fullName: 'b'.repeat(300) },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(result.updateMe.error).toMatchInlineSnapshot(`
    {
      inputErrors: {
        displayName: Display name must be at most 25 characters long,
        fullName: Full name must be at most 25 characters long,
      },
      message: Please check your input.,
    }
  `);
});
