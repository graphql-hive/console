import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';

const WhoAmI = graphql(`
  query projectBySlug {
    whoAmI {
      resolvedPermissions {
        level
        resolvedPermissionGroups {
          permissions {
            permission {
              id
            }
          }
        }
        resolvedResourceIds
      }
    }
  }
`);

/**
 * Get a object representation of all the permissions issued to an access token.
 */
export function fetchPermissions(accessToken: string) {
  return execute({
    document: WhoAmI,
    authToken: accessToken,
  })
    .then(e => e.expectNoGraphQLErrors())
    .then(res => res.whoAmI?.resolvedPermissions);
}

const DeleteAccessTokenMutation = graphql(`
  mutation DeleteAccessTokenMutation($accessTokenId: ID!) {
    deleteAccessToken(input: { accessToken: { byId: $accessTokenId } }) {
      error {
        message
      }
      ok {
        deletedAccessTokenId
      }
    }
  }
`);

export function deleteAccessToken(accessTokenId: string, authToken: string) {
  return execute({
    document: DeleteAccessTokenMutation,
    variables: {
      accessTokenId,
    },
    authToken,
  });
}
