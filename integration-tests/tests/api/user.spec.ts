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
