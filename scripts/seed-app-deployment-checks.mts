/**
 * Seeds app deployments and schema checks that reference each other, so a failed check's
 * affected app deployments can be verified in the UI.
 *
 * Requirements:
 * - Docker Compose is started (pnpm start)
 * - FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1 in server .env
 * - An empty target: the script publishes its own schema and refuses a target that already has
 *   one. FORCE=1 publishes over it anyway.
 *
 * Example:
 * `TOKEN=<access_token> pnpm seed:app-deployment-checks`
 *
 * Where <access_token> is a Registry Access Token from the target's Settings page.
 *
 * Creates, in order:
 * 1. a schema version with User and Product types
 * 2. forty app deployments across four apps holding persisted documents against that schema,
 *    with the first version of each app retired, plus one pending deployment; the latest web-app
 *    version holds 24 documents
 * 3. three schema checks: one removing User.email (31 active deployments hold GetUser), one
 *    removing User.email and Product.description (5 hold GetProduct, listed inline on the check),
 *    and one safe addition
 *
 * That is three pages of app deployments, two pages of affected deployments on the User.email
 * change, and two pages of documents on web-app@1.13.0.
 */

const token = process.env.TOKEN || process.env.HIVE_TOKEN;

if (!token) {
  console.error('Missing "TOKEN" environment variable.');
  console.error('Usage: TOKEN=<access_token> pnpm seed:app-deployment-checks');
  process.exit(1);
}

const graphqlEndpoint = 'http://localhost:3001/graphql';
const appBaseUrl = 'http://localhost:3000';

async function executeGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (result.errors?.length) {
    throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join(', ')}`);
  }

  return result.data as T;
}

const TokenInfo = /* GraphQL */ `
  query TokenInfo {
    tokenInfo {
      __typename
      ... on TokenInfo {
        organization {
          slug
        }
        project {
          slug
        }
        target {
          slug
          latestSchemaVersion {
            id
          }
        }
      }
      ... on TokenNotFoundError {
        message
      }
    }
  }
`;

const SchemaPublish = /* GraphQL */ `
  mutation SchemaPublish($input: SchemaPublishInput!) {
    schemaPublish(input: $input) {
      __typename
      ... on SchemaPublishSuccess {
        valid
        linkToWebsite
      }
      ... on SchemaPublishError {
        valid
        errors {
          nodes {
            message
          }
        }
      }
    }
  }
`;

const SchemaCheck = /* GraphQL */ `
  mutation SchemaCheck($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      __typename
      ... on SchemaCheckSuccess {
        valid
        schemaCheck {
          webUrl
        }
      }
      ... on SchemaCheckError {
        valid
        schemaCheck {
          webUrl
        }
        errors {
          nodes {
            message
          }
        }
      }
    }
  }
`;

const CreateAppDeployment = /* GraphQL */ `
  mutation CreateAppDeployment($input: CreateAppDeploymentInput!) {
    createAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        createdAppDeployment {
          id
        }
      }
    }
  }
`;

const AddDocumentsToAppDeployment = /* GraphQL */ `
  mutation AddDocumentsToAppDeployment($input: AddDocumentsToAppDeploymentInput!) {
    addDocumentsToAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        appDeployment {
          id
        }
      }
    }
  }
`;

const ActivateAppDeployment = /* GraphQL */ `
  mutation ActivateAppDeployment($input: ActivateAppDeploymentInput!) {
    activateAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        activatedAppDeployment {
          id
        }
      }
    }
  }
`;

const RetireAppDeployment = /* GraphQL */ `
  mutation RetireAppDeployment($input: RetireAppDeploymentInput!) {
    retireAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        retiredAppDeployment {
          id
        }
      }
    }
  }
`;

type MutationResult<TKey extends string, TOk> = Record<
  TKey,
  { error: { message: string } | null; ok: TOk | null }
>;

function sdl(opts: {
  userEmail?: boolean;
  productDescription?: boolean;
  extraQueryField?: string;
}) {
  const { userEmail = true, productDescription = true, extraQueryField = '' } = opts;
  return /* GraphQL */ `
    type Query {
      user(id: ID!): User
      users(limit: Int): [User!]!
      product(id: ID!): Product
      products(category: String): [Product!]!
      search(term: String!): [SearchResult!]!
      ${extraQueryField}
    }

    type Mutation {
      createUser(input: CreateUserInput!): User!
      updateUser(id: ID!, input: UpdateUserInput!): User!
      deleteUser(id: ID!): Boolean!
    }

    type User {
      id: ID!
      name: String!
      ${userEmail ? 'email: String!' : ''}
    }

    type Product {
      id: ID!
      name: String!
      price: Float!
      ${productDescription ? 'description: String' : ''}
    }

    union SearchResult = User | Product

    input CreateUserInput {
      name: String!
      email: String!
    }

    input UpdateUserInput {
      name: String
      email: String
    }
  `;
}

const documents = {
  getUser: {
    hash: 'get-user-query',
    body: 'query GetUser($id: ID!) { user(id: $id) { id name email } }',
  },
  listUsers: {
    hash: 'list-users-query',
    body: 'query ListUsers($limit: Int) { users(limit: $limit) { id name } }',
  },
  createUser: {
    hash: 'create-user-mutation',
    body: 'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
  },
  updateUser: {
    hash: 'update-user-mutation',
    body: 'mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id name } }',
  },
  deleteUser: {
    hash: 'delete-user-mutation',
    body: 'mutation DeleteUser($id: ID!) { deleteUser(id: $id) }',
  },
  getProducts: {
    hash: 'get-products-query',
    body: 'query GetProducts($category: String) { products(category: $category) { id name price } }',
  },
  getProduct: {
    hash: 'get-product-query',
    body: 'query GetProduct($id: ID!) { product(id: $id) { id name price description } }',
  },
  search: {
    hash: 'search-query',
    body: 'query Search($term: String!) { search(term: $term) { __typename ... on User { id name } ... on Product { id name } } }',
  },
};

// Which documents an app holds decides which checks break it: GetUser reads User.email and
// GetProduct reads Product.description. Retired and pending deployments never count as affected.
// The counts are what page the tables: the apps and affected deployments tables page at 20 and
// the documents table at 20, and the check page only links to the affected deployments page
// above five affected. The first version of each app is retired.
const apps = [
  {
    name: 'web-app',
    versionCount: 14,
    documents: [documents.getUser, documents.listUsers, documents.getProducts, documents.search],
    // Enough documents on the latest version to page its documents table.
    extraUserQueriesOnLatest: 20,
  },
  {
    name: 'mobile-app',
    versionCount: 12,
    documents: [documents.getUser, documents.listUsers, documents.search],
  },
  {
    name: 'admin-dashboard',
    versionCount: 8,
    documents: [
      documents.getUser,
      documents.listUsers,
      documents.createUser,
      documents.updateUser,
      documents.deleteUser,
    ],
  },
  {
    name: 'cli-tool',
    versionCount: 6,
    documents: [documents.listUsers, documents.getProducts, documents.getProduct],
  },
];

const versionsOf = (count: number) => Array.from({ length: count }, (_, i) => `1.${i}.0`);

const userQueries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    hash: `get-user-${i + 1}-query`,
    body: `query GetUser${i + 1}($id: ID!) { user(id: $id) { id name email } }`,
  }));

async function createDeployment(args: {
  appName: string;
  appVersion: string;
  documents: Array<{ hash: string; body: string }>;
  activate: boolean;
  retire?: boolean;
}) {
  const label = `${args.appName}@${args.appVersion}`;

  const created = await executeGraphQL<MutationResult<'createAppDeployment', unknown>>(
    CreateAppDeployment,
    { input: { appName: args.appName, appVersion: args.appVersion } },
  );
  if (created.createAppDeployment.error) {
    throw new Error(`Create ${label}: ${created.createAppDeployment.error.message}`);
  }

  const added = await executeGraphQL<MutationResult<'addDocumentsToAppDeployment', unknown>>(
    AddDocumentsToAppDeployment,
    { input: { appName: args.appName, appVersion: args.appVersion, documents: args.documents } },
  );
  if (added.addDocumentsToAppDeployment.error) {
    throw new Error(
      `Add documents to ${label}: ${added.addDocumentsToAppDeployment.error.message}`,
    );
  }

  if (!args.activate) {
    console.log(`  ${label}: pending, ${args.documents.length} documents`);
    return;
  }

  const activated = await executeGraphQL<MutationResult<'activateAppDeployment', unknown>>(
    ActivateAppDeployment,
    { input: { appName: args.appName, appVersion: args.appVersion } },
  );
  if (activated.activateAppDeployment.error) {
    throw new Error(`Activate ${label}: ${activated.activateAppDeployment.error.message}`);
  }

  if (args.retire) {
    const retired = await executeGraphQL<MutationResult<'retireAppDeployment', unknown>>(
      RetireAppDeployment,
      { input: { appName: args.appName, appVersion: args.appVersion } },
    );
    if (retired.retireAppDeployment.error) {
      throw new Error(`Retire ${label}: ${retired.retireAppDeployment.error.message}`);
    }
  }

  console.log(
    `  ${label}: ${args.retire ? 'retired' : 'active'}, ${args.documents.length} documents`,
  );
}

async function runCheck(label: string, checkSdl: string) {
  const result = await executeGraphQL<{
    schemaCheck: {
      __typename: string;
      valid: boolean;
      schemaCheck: { webUrl: string } | null;
      errors?: { nodes: Array<{ message: string }> };
    };
  }>(SchemaCheck, { input: { sdl: checkSdl } });

  const check = result.schemaCheck;
  const outcome = check.valid ? 'passed' : 'failed';
  const errors = check.errors?.nodes.map(node => `\n      ${node.message}`).join('') ?? '';
  console.log(`  ${label}: ${outcome}${errors}\n    ${check.schemaCheck?.webUrl ?? '(no url)'}`);
}

const info = await executeGraphQL<{
  tokenInfo:
    | {
        __typename: 'TokenInfo';
        organization: { slug: string };
        project: { slug: string };
        target: { slug: string; latestSchemaVersion: { id: string } | null };
      }
    | { __typename: 'TokenNotFoundError'; message: string };
}>(TokenInfo);

if (info.tokenInfo.__typename !== 'TokenInfo') {
  console.error(`Token rejected: ${info.tokenInfo.message}`);
  process.exit(1);
}

const targetPath = `${info.tokenInfo.organization.slug}/${info.tokenInfo.project.slug}/${info.tokenInfo.target.slug}`;

if (info.tokenInfo.target.latestSchemaVersion && process.env.FORCE !== '1') {
  console.error(
    `Target ${targetPath} already has a schema. Point the token at an empty target, or set FORCE=1 to publish over it.`,
  );
  process.exit(1);
}

console.log(`\nSeeding ${targetPath} through ${graphqlEndpoint}\n`);

console.log('Publishing the base schema:');
const published = await executeGraphQL<{
  schemaPublish: {
    __typename: string;
    valid: boolean;
    linkToWebsite?: string | null;
    errors?: { nodes: Array<{ message: string }> };
  };
}>(SchemaPublish, {
  input: { sdl: sdl({}), author: 'seed', commit: `seed-${Date.now()}` },
});
if (!published.schemaPublish.valid) {
  const messages = published.schemaPublish.errors?.nodes.map(node => node.message).join(', ');
  throw new Error(`Publish failed: ${messages ?? published.schemaPublish.__typename}`);
}
console.log(`  ${published.schemaPublish.linkToWebsite ?? 'published'}\n`);

console.log('Creating app deployments:');
for (const app of apps) {
  const versions = versionsOf(app.versionCount);
  for (const [index, version] of versions.entries()) {
    const isLatest = index === versions.length - 1;
    await createDeployment({
      appName: app.name,
      appVersion: version,
      documents:
        isLatest && app.extraUserQueriesOnLatest
          ? [...app.documents, ...userQueries(app.extraUserQueriesOnLatest)]
          : app.documents,
      activate: true,
      retire: index === 0,
    });
  }
}
await createDeployment({
  appName: 'beta-app',
  appVersion: '0.0.1-beta',
  documents: [documents.getUser, documents.listUsers],
  activate: false,
});

console.log('\nRunning schema checks:');
await runCheck('Remove User.email', sdl({ userEmail: false }));
await runCheck(
  'Remove User.email and Product.description',
  sdl({ userEmail: false, productDescription: false }),
);
await runCheck('Add Query.health', sdl({ extraQueryField: 'health: String' }));

console.log(`
Done.
  App deployments: ${appBaseUrl}/${targetPath}/apps
  Documents:       ${appBaseUrl}/${targetPath}/apps/web-app/1.13.0
  Checks:          ${appBaseUrl}/${targetPath}/checks
Open the failed "Remove User.email" check, expand the breaking change and follow its affected
deployments link.
`);
