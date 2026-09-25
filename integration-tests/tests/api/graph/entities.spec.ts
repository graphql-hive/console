import { createContract, disableContract } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { assertNonNullish } from 'testkit/utils';

test.concurrent('creating a target creates its default graph', async ({ expect }) => {
  const { createOrg, getGraphStore } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTarget } = await createProject(ProjectType.Federation);

  const result = await createTarget().then(r => r.expectNoGraphQLErrors());
  const target = result.createTarget.ok?.createdTarget;
  assertNonNullish(target);

  const graph = await getGraphStore().then(store =>
    store.findGraphForTargetIdByName(target.id, 'default'),
  );

  expect(graph).toMatchObject({
    targetId: target.id,
    name: 'default',
    type: 'BASE',
    config: null,
    sourceGraphId: null,
  });
});

test.concurrent('creating a contract creates its contract graph', async ({ expect }) => {
  const { createOrg, getGraphStore, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target } = await createProject(ProjectType.Federation);

  const result = await createContract(
    {
      target: { byId: target.id },
      contractName: 'my-contract',
      includeTags: ['public'],
      removeUnreachableTypesFromPublicApiSchema: true,
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(result.createContract.error).toBeNull();

  const graphStore = await getGraphStore();
  const sourceGraph = await graphStore.findGraphForTargetIdByName(target.id, 'default');
  const contractGraph = await graphStore.findGraphForTargetIdByName(
    target.id,
    'default/my-contract',
  );
  assertNonNullish(sourceGraph);

  expect(contractGraph).toMatchObject({
    targetId: target.id,
    name: 'default/my-contract',
    type: 'CONTRACT',
    sourceGraphId: sourceGraph.id,
    config: {
      includeTags: ['public'],
      excludeTags: null,
      isDisabled: false,
      removeUnreachableTypesFromPublicApiSchema: true,
    },
  });
});

test.concurrent('disabling a contract deletes its contract graph', async ({ expect }) => {
  const { createOrg, getGraphStore, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target } = await createProject(ProjectType.Federation);

  const createResult = await createContract(
    {
      target: { byId: target.id },
      contractName: 'my-contract',
      removeUnreachableTypesFromPublicApiSchema: false,
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  const contract = createResult.createContract.ok?.createdContract;
  assertNonNullish(contract);

  const graphStore = await getGraphStore();
  expect(
    await graphStore.findGraphForTargetIdByName(target.id, 'default/my-contract'),
  ).not.toBeNull();

  const disableResult = await disableContract(
    {
      contract: {
        byId: contract.id,
      },
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  expect(disableResult.disableContract.error).toBeNull();
  expect(disableResult.disableContract.ok?.disabledContract.isDisabled).toBe(true);
  expect(await graphStore.findGraphForTargetIdByName(target.id, 'default/my-contract')).toBeNull();
});
