/**
 * Script for seeding app deployments into an existing target.
 *
 * Requirements:
 * - Docker Compose is started (pnpm start)
 * - FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1 in server .env
 * - A published schema in the target
 *
 * Example:
 * `TOKEN=<access_token> pnpm seed:app-deployments`
 *
 * Where <access_token> is a Target Access Token from the target's Settings page.
 */

const token = process.env.TOKEN || process.env.HIVE_TOKEN;

if (!token) {
  console.error('Missing "TOKEN" environment variable.');
  console.error('Usage: TOKEN=<access_token> pnpm seed:app-deployments');
  process.exit(1);
}

const graphqlEndpoint = 'http://localhost:3001/graphql';

async function executeGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
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

const CreateAppDeployment = /* GraphQL */ `
  mutation CreateAppDeployment($input: CreateAppDeploymentInput!) {
    createAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        createdAppDeployment {
          id
          name
          version
          status
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
          name
          version
          status
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
          name
          version
          status
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
          name
          version
          status
        }
      }
    }
  }
`;

// Sample GraphQL documents for app deployments
const sampleDocuments = [
  { hash: 'get-user-query', body: 'query GetUser($id: ID!) { user(id: $id) { id name email } }' },
  {
    hash: 'list-users-query',
    body: 'query ListUsers($limit: Int) { users(limit: $limit) { id name } }',
  },
  {
    hash: 'create-user-mutation',
    body: 'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
  },
  {
    hash: 'update-user-mutation',
    body: 'mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id name } }',
  },
  { hash: 'delete-user-mutation', body: 'mutation DeleteUser($id: ID!) { deleteUser(id: $id) }' },
  {
    hash: 'get-products-query',
    body: 'query GetProducts($category: String) { products(category: $category) { id name price } }',
  },
  {
    hash: 'get-product-query',
    body: 'query GetProduct($id: ID!) { product(id: $id) { id name price description } }',
  },
  {
    hash: 'search-query',
    body: 'query Search($term: String!) { search(term: $term) { __typename ... on User { id name } ... on Product { id name } } }',
  },
];

// App deployment configurations to create
const appDeployments = [
  { name: 'web-app', versions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0'] },
  { name: 'mobile-app', versions: ['3.0.0', '3.1.0', '3.2.0'] },
  { name: 'admin-dashboard', versions: ['1.0.0', '1.0.1'] },
  { name: 'cli-tool', versions: ['0.1.0', '0.2.0', '1.0.0'] },
];

async function createAppDeploymentWithDocuments(
  appName: string,
  appVersion: string,
  documents: Array<{ hash: string; body: string }>,
  shouldActivate: boolean,
  shouldRetire: boolean = false,
) {
  // Create the app deployment
  const createResult = await executeGraphQL<{
    createAppDeployment: {
      error: { message: string } | null;
      ok: { createdAppDeployment: { id: string; name: string; version: string; status: string } } | null;
    };
  }>(CreateAppDeployment, { input: { appName, appVersion } });

  if (createResult.createAppDeployment.error) {
    console.error(
      `  Failed to create ${appName}@${appVersion}:`,
      createResult.createAppDeployment.error.message,
    );
    return null;
  }

  console.log(`  Created ${appName}@${appVersion} (pending)`);

  // Add documents
  const addDocsResult = await executeGraphQL<{
    addDocumentsToAppDeployment: {
      error: { message: string } | null;
      ok: { appDeployment: { id: string } } | null;
    };
  }>(AddDocumentsToAppDeployment, { input: { appName, appVersion, documents } });

  if (addDocsResult.addDocumentsToAppDeployment.error) {
    console.error(
      `  Failed to add documents to ${appName}@${appVersion}:`,
      addDocsResult.addDocumentsToAppDeployment.error.message,
    );
    return null;
  }

  console.log(`  Added ${documents.length} documents to ${appName}@${appVersion}`);

  if (shouldActivate) {
    const activateResult = await executeGraphQL<{
      activateAppDeployment: {
        error: { message: string } | null;
        ok: { activatedAppDeployment: { id: string } } | null;
      };
    }>(ActivateAppDeployment, { input: { appName, appVersion } });

    if (activateResult.activateAppDeployment.error) {
      console.error(
        `  Failed to activate ${appName}@${appVersion}:`,
        activateResult.activateAppDeployment.error.message,
      );
      return null;
    }

    console.log(`  Activated ${appName}@${appVersion}`);

    if (shouldRetire) {
      const retireResult = await executeGraphQL<{
        retireAppDeployment: {
          error: { message: string } | null;
          ok: { retiredAppDeployment: { id: string } } | null;
        };
      }>(RetireAppDeployment, { input: { appName, appVersion } });

      if (retireResult.retireAppDeployment.error) {
        console.error(
          `  Failed to retire ${appName}@${appVersion}:`,
          retireResult.retireAppDeployment.error.message,
        );
        return null;
      }

      console.log(`  Retired ${appName}@${appVersion}`);
    }
  }

  return createResult.createAppDeployment.ok?.createdAppDeployment;
}

console.log(`
  GraphQL endpoint: ${graphqlEndpoint}
`);

console.log('Creating app deployments...\n');

for (const app of appDeployments) {
  console.log(`Creating deployments for ${app.name}:`);

  for (let i = 0; i < app.versions.length; i++) {
    const version = app.versions[i];
    const isLatest = i === app.versions.length - 1;
    const isOldest = i === 0;

    // Select a subset of documents for variety
    const docsToUse = sampleDocuments.slice(0, 3 + (i % 5));

    // Activate all versions, retire old ones (except the latest)
    const shouldActivate = true;
    const shouldRetire = !isLatest && isOldest;

    await createAppDeploymentWithDocuments(app.name, version, docsToUse, shouldActivate, shouldRetire);
  }
  console.log('');
}

// Create one pending deployment (not activated)
console.log('Creating a pending deployment:');
await createAppDeploymentWithDocuments(
  'beta-app',
  '0.0.1-beta',
  sampleDocuments.slice(0, 2),
  false, // Don't activate
);

console.log('\n========================================');
console.log('App deployments seeded successfully!');
console.log('========================================\n');
