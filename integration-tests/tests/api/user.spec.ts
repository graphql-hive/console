import { graphql } from 'testkit/gql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';

const UpdateMeMutation = graphql(`
  mutation UsersSpecUpdateMe($input: UpdateMeInput!) {
    updateMe(input: $input) {
      error {
        message
      }
      ok {
        updatedUser {
          id
          displayName
          fullName
        }
      }
    }
  }
`);

test('can full name and display name', async () => {
  const { ownerToken } = await initSeed().createOwner();

  const result = await execute({
    document: UpdateMeMutation,
    variables: {
      input: {
        displayName: 'vegapunk',
        fullName: 'Vincent Vega',
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

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
