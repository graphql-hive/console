import {
  createContract,
  disableContract,
  getSchemaVersionWithAllDetails,
  publishSchema,
  schemaVersionPromote,
} from 'testkit/flow';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { assertNonNull, assertNonNullish } from 'testkit/utils';
import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { initSeed } from '../../../testkit/seed';

const s3Client = new S3Client({
  endpoint: 'http://127.0.0.1:9000',
  region: 'auto',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

async function fetchS3ObjectArtifact(
  key: string,
  bucketName = 'artifacts',
): Promise<null | { body: string; eTag: string; metadata: Record<string, string> }> {
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  try {
    const result = await s3Client.send(getObjectCommand);
    return {
      body: await result.Body!.transformToString(),
      eTag: result.ETag!,
      metadata: result.Metadata!,
    };
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return null;
    }
    throw error;
  }
}

test.concurrent(
  'promote latest schema version within the same target via target input',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    const publishResult = await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion, publishedVersion] = await fetchVersions(2);
    assertNonNull(promotedVersion);
    assertNonNull(publishedVersion);

    expect(promotedVersion.previousDiffableSchemaVersion?.id).toEqual(publishedVersion.id);
    expect(promotedVersion.valid).toEqual(true);
    expect(publishedVersion.valid).toEqual(true);
    expect(promotedVersion.supergraph).toEqual(publishedVersion.supergraph);
  },
);

test.concurrent(
  'promote latest schema version from one target to another empty target',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions, createTarget } = await createProject(ProjectType.Federation);
    const createTargetResult = await createTarget().then(r => r.expectNoGraphQLErrors());
    const otherTarget = createTargetResult.createTarget.ok?.createdTarget;
    assertNonNullish(otherTarget);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    const publishResult = await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: otherTarget.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [publishedVersion] = await fetchVersions(1);
    const [promotedVersion] = await fetchVersions(1, otherTarget);

    assertNonNull(promotedVersion);
    assertNonNull(publishedVersion);

    // we always compare to the latest schema version within the same target, thus this is null
    expect(promotedVersion.previousDiffableSchemaVersion).toEqual(null);
    expect(promotedVersion.valid).toEqual(true);
    expect(publishedVersion.valid).toEqual(true);
    expect(promotedVersion.supergraph).toEqual(publishedVersion.supergraph);
  },
);

test.concurrent(
  'promote latest schema version from one target to another non-empty target',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions, createTarget } = await createProject(ProjectType.Federation);
    const createTargetResult = await createTarget().then(r => r.expectNoGraphQLErrors());
    const otherTarget = createTargetResult.createTarget.ok?.createdTarget;
    assertNonNullish(otherTarget);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    let publishResult = await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    publishResult = await publishSchema(
      {
        author: 'b',
        commit: 'b',
        sdl: /* GraphQL */ `
          type Query {
            b: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: otherTarget.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: otherTarget.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion, publishedVersion] = await fetchVersions(2, otherTarget);

    assertNonNull(promotedVersion);
    assertNonNull(publishedVersion);

    // we always compare to the latest schema version within the same target, thus this is null
    expect(promotedVersion.previousDiffableSchemaVersion?.id).toEqual(publishedVersion.id);
    expect(promotedVersion.valid).toEqual(true);
    expect(publishedVersion.valid).toEqual(true);
    expect(promotedVersion.supergraph).not.toEqual(publishedVersion.supergraph);
  },
);

test.concurrent('promote specific schema version within the same target', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { target, fetchVersions } = await createProject(ProjectType.Federation);
  const { privateAccessKey } = await createOrganizationAccessToken({
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
    permissions: ['schemaVersion:publish'],
  });

  let publishResult = await publishSchema(
    {
      author: 'a',
      commit: 'a',
      sdl: /* GraphQL */ `
        type Query {
          a: String!
        }
      `,
      service: 'a',
      url: 'http://a',
      target: {
        byId: target.id,
      },
    },
    privateAccessKey,
  ).then(r => r.expectNoGraphQLErrors());

  if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
    throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
  }

  publishResult = await publishSchema(
    {
      author: 'a',
      commit: 'a',
      sdl: /* GraphQL */ `
        type Query {
          b: String!
        }
      `,
      service: 'a',
      url: 'http://a',
      target: {
        byId: target.id,
      },
    },
    privateAccessKey,
  ).then(r => r.expectNoGraphQLErrors());

  if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
    throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
  }

  publishResult = await publishSchema(
    {
      author: 'a',
      commit: 'a',
      sdl: /* GraphQL */ `
        type Query {
          c: String!
        }
      `,
      service: 'a',
      url: 'http://a',
      target: {
        byId: target.id,
      },
    },
    privateAccessKey,
  ).then(r => r.expectNoGraphQLErrors());

  if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
    throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
  }

  const [previousVersion, , firstVersion] = await fetchVersions(3);
  assertNonNullish(firstVersion);
  expect(firstVersion.previousDiffableSchemaVersion).toEqual(null);

  const promoteResult = await schemaVersionPromote(
    {
      source: {
        fromSchemaVersionById: firstVersion.id,
      },
      target: {
        toTarget: {
          byId: target.id,
        },
      },
    },
    privateAccessKey,
  ).then(r => r.expectNoGraphQLErrors());

  expect(promoteResult.schemaVersionPromote).toMatchObject({
    ok: {},
    error: null,
  });
  const [promotedVersion] = await fetchVersions(1);
  expect(promotedVersion.origin).toEqual({
    __typename: 'SchemaVersionPromoteOrigin',
    schemaVersionId: firstVersion.id,
  });
  expect(promotedVersion.previousDiffableSchemaVersion?.id).toEqual(previousVersion.id);
});

test.concurrent('promote non-existing schema version yields error', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { target } = await createProject(ProjectType.Federation);
  const { privateAccessKey } = await createOrganizationAccessToken({
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
    permissions: ['schemaVersion:publish'],
  });

  const promoteResult = await schemaVersionPromote(
    {
      source: {
        fromSchemaVersionById: crypto.randomUUID(),
      },
      target: {
        toTarget: {
          byId: target.id,
        },
      },
    },
    privateAccessKey,
  ).then(r => r.expectNoGraphQLErrors());

  expect(promoteResult.schemaVersionPromote).toMatchObject({
    ok: {},
    error: {
      message: 'Schema Version not found.',
    },
  });
});

test.concurrent(
  'promote schema version from different project yields error',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { target: otherTarget } = await createProject(ProjectType.Federation);

    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    let publishResult = await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    const [version] = await fetchVersions(1);
    assertNonNullish(version);

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromSchemaVersionById: version.id,
        },
        target: {
          toTarget: {
            byId: otherTarget.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: {
        message: 'Schema Version not found.',
      },
    });
  },
);

test.concurrent('missing schema publish permissions target yields error', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { target } = await createProject(ProjectType.Federation);

  const { privateAccessKey } = await createOrganizationAccessToken({
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
    permissions: ['project:describe'],
  });

  const promoteResultErrors = await schemaVersionPromote(
    {
      source: {
        fromTarget: {
          byId: target.id,
        },
      },
      target: {
        toTarget: {
          byId: target.id,
        },
      },
    },
    privateAccessKey,
  ).then(r => r.expectGraphQLErrors());
  expect(promoteResultErrors.length).toEqual(1);
  expect(promoteResultErrors.at(0)?.message).toEqual(
    `No access (reason: "Missing permission for performing 'schemaVersion:publish' on resource")`,
  );
  expect(promoteResultErrors.at(0)?.extensions?.code).toEqual(`UNAUTHORISED`);
});

test.concurrent(
  'promote valid schema version within target updates CDN artifacts',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    const publishResult = await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    if (publishResult.schemaPublish.__typename !== 'SchemaPublishSuccess') {
      throw new Error('Unexpected mutation result ' + publishResult.schemaPublish.__typename);
    }

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion] = await fetchVersions(1);
    assertNonNullish(promotedVersion);

    const s3Artifact = await fetchS3ObjectArtifact(`artifact/${target.id}/supergraph`);
    assertNonNullish(s3Artifact);
    expect(s3Artifact.metadata).toEqual({
      'x-hive-schema-version-id': promotedVersion.id,
    });
  },
);

test.concurrent(
  'promote valid schema version to another target updated CDN artifacts',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions, createTarget } = await createProject(ProjectType.Federation);
    const createTargetResult = await createTarget().then(r => r.expectNoGraphQLErrors());
    const otherTarget = createTargetResult.createTarget.ok?.createdTarget;
    assertNonNullish(otherTarget);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish'],
    });

    await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: otherTarget.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion] = await fetchVersions(1, otherTarget);
    assertNonNullish(promotedVersion);

    const s3Artifact = await fetchS3ObjectArtifact(`artifact/${otherTarget.id}/supergraph`);
    assertNonNullish(s3Artifact);
    expect(s3Artifact.metadata).toEqual({
      'x-hive-schema-version-id': promotedVersion.id,
    });
  },
);

test.concurrent(
  'promote schema version within target moves along active contracts',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish', 'target:modifySettings', 'project:describe'],
    });

    await createContract(
      {
        contractName: 'public',
        target: {
          byId: target.id,
        },
        includeTags: ['public'],
        removeUnreachableTypesFromPublicApiSchema: true,
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
            b: String! @tag(name: "public")
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion, publishedVersion] = await fetchVersions(2);
    assertNonNullish(promotedVersion);
    assertNonNullish(publishedVersion);

    const version = await getSchemaVersionWithAllDetails(
      target.id,
      promotedVersion.id,
      privateAccessKey,
    );
    assertNonNullish(version);
    expect(version.contractVersions?.edges.length).toEqual(1);
  },
);

test.concurrent(
  'promote schema version within target does not move along disabled contracts',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish', 'target:modifySettings', 'project:describe'],
    });

    await createContract(
      {
        contractName: 'public',
        target: {
          byId: target.id,
        },
        includeTags: ['public'],
        removeUnreachableTypesFromPublicApiSchema: true,
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const contractId = await createContract(
      {
        contractName: 'public-2',
        target: {
          byId: target.id,
        },
        includeTags: ['public'],
        removeUnreachableTypesFromPublicApiSchema: true,
      },
      privateAccessKey,
    )
      .then(r => r.expectNoGraphQLErrors())
      .then(r => r.createContract.ok?.createdContract.id);
    assertNonNullish(contractId);

    await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
            b: String! @tag(name: "public")
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    await disableContract(
      {
        contract: {
          byId: contractId,
        },
      },
      privateAccessKey,
    );

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion, publishedVersion] = await fetchVersions(2);
    assertNonNullish(promotedVersion);
    assertNonNullish(publishedVersion);

    const promotedVersionDetails = await getSchemaVersionWithAllDetails(
      target.id,
      promotedVersion.id,
      privateAccessKey,
    );
    assertNonNullish(promotedVersionDetails);
    expect(promotedVersionDetails.contractVersions?.edges.length).toEqual(1);

    expect(
      promotedVersionDetails.contractVersions?.edges.map(edge => edge.node.contractName),
    ).toEqual(['public']);

    const publishedVersionDetails = await getSchemaVersionWithAllDetails(
      target.id,
      publishedVersion.id,
      privateAccessKey,
    );
    assertNonNull(publishedVersionDetails);
    expect(publishedVersionDetails.contractVersions?.edges.length).toEqual(2);
    expect(
      publishedVersionDetails.contractVersions?.edges.map(edge => edge.node.contractName),
    ).toEqual(['public', 'public-2']);
  },
);

test.concurrent(
  'promote schema version within target includes contract version for contract definition added after the origin version was created',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions } = await createProject(ProjectType.Federation);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish', 'target:modifySettings', 'project:describe'],
    });

    await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
            b: String! @tag(name: "public")
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    await createContract(
      {
        contractName: 'public',
        target: {
          byId: target.id,
        },
        includeTags: ['public'],
        removeUnreachableTypesFromPublicApiSchema: true,
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion, publishedVersion] = await fetchVersions(2);
    assertNonNullish(promotedVersion);
    assertNonNullish(publishedVersion);

    const promotedVersionDetails = await getSchemaVersionWithAllDetails(
      target.id,
      promotedVersion.id,
      privateAccessKey,
    );
    assertNonNullish(promotedVersionDetails);
    expect(promotedVersionDetails.contractVersions?.edges.length).toEqual(1);

    expect(
      promotedVersionDetails.contractVersions?.edges.map(edge => edge.node.contractName),
    ).toEqual(['public']);

    const publishedVersionDetails = await getSchemaVersionWithAllDetails(
      target.id,
      publishedVersion.id,
      privateAccessKey,
    );
    assertNonNull(publishedVersionDetails);
    expect(publishedVersionDetails.contractVersions).toEqual(null);
  },
);
