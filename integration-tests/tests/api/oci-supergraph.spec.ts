/**
 * Supergraph OCI images, end to end, exercised exclusively through public APIs:
 *
 *   schema registry action (GraphQL API) -> image publishing (workflows)
 *   -> OCI Distribution pull API (CDN)
 *
 * The pull API is tested through the CDN embedded in the API (server container).
 */
import { createHash, randomUUID } from 'node:crypto';
import { PassThrough, type Stream } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import Docker from 'dockerode';
import {
  createContract,
  getSchemaVersionWithAllDetails,
  pollFor,
  publishSchema,
  schemaVersionPromote,
} from 'testkit/flow';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { generateUnique, getServiceHost } from 'testkit/utils';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// OCI pull API client
// ---------------------------------------------------------------------------

// The API embedded CDN serves the OCI API at the root `/v2/`.
const baseUrl = lazy(async () => `http://${await getServiceHost('server', 8082)}`);

function basicAuth(token: string, username = 'hive') {
  return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
}

function sha256Hex(content: Buffer | string) {
  return createHash('sha256').update(content).digest('hex');
}

function sha256Digest(content: Buffer) {
  return `sha256:${sha256Hex(content)}`;
}

/** Tag of a supergraph image: `<graph-name>-<graph-version-id>`. */
function supergraphTag(graphName: string, versionId: string) {
  return `${graphName}-${versionId}`;
}

type Descriptor = z.infer<typeof DescriptorModel>;
const DescriptorModel = z.object({ mediaType: z.string(), digest: z.string(), size: z.number() });

const ManifestModel = z.object({
  schemaVersion: z.literal(2),
  mediaType: z.literal('application/vnd.oci.image.manifest.v1+json'),
  config: DescriptorModel,
  layers: z.array(DescriptorModel),
  annotations: z.record(z.string(), z.string()),
});

type Blob = { descriptor: Descriptor; content: Buffer };

/**
 * Waits until the image is published, then pulls the manifest and all blobs through the OCI pull
 * API, verifying every digest and size like a container runtime would.
 */
async function pullImage(args: { targetId: string; tag: string; cdnAccessToken: string }) {
  const repository = `${await baseUrl()}/v2/${args.targetId}/supergraph`;
  const headers = { authorization: basicAuth(args.cdnAccessToken) };

  let manifestResponse: Response | null = null;
  await pollFor(
    async () => {
      const response = await fetch(`${repository}/manifests/${args.tag}`, { headers });
      if (response.status === 404) {
        return false;
      }
      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}: ${await response.text()}`);
      }
      manifestResponse = response;
      return true;
    },
    { maxWait: 30_000 },
  );

  const manifestContent = Buffer.from(await manifestResponse!.arrayBuffer());
  const manifestDigest = sha256Digest(manifestContent);
  if (manifestResponse!.headers.get('docker-content-digest') !== manifestDigest) {
    throw new Error('Manifest digest mismatch.');
  }
  const manifest = ManifestModel.parse(JSON.parse(manifestContent.toString('utf8')));

  async function pullBlob(descriptor: Descriptor): Promise<Blob> {
    const response = await fetch(`${repository}/blobs/${descriptor.digest}`, { headers });
    if (response.status !== 200) {
      throw new Error(`Unexpected status ${response.status} for blob ${descriptor.digest}.`);
    }
    const content = Buffer.from(await response.arrayBuffer());
    if (sha256Digest(content) !== descriptor.digest || content.length !== descriptor.size) {
      throw new Error(`Blob ${descriptor.digest} does not match its descriptor.`);
    }
    return { descriptor, content };
  }

  const config = await pullBlob(manifest.config);
  const [supergraph, metadata] = await Promise.all(manifest.layers.map(pullBlob));

  const files = new Map<string, string>();
  for (const layer of [supergraph, metadata]) {
    for (const entry of readTar(gunzipSync(layer.content))) {
      if (entry.type === '0') {
        files.set(entry.name, entry.content.toString('utf8'));
      }
    }
  }

  return {
    tag: args.tag,
    manifest: {
      descriptor: {
        mediaType: manifest.mediaType,
        digest: manifestDigest,
        size: manifestContent.length,
      },
      content: manifestContent,
      json: manifest,
    },
    config: { ...config, json: JSON.parse(config.content.toString('utf8')) },
    layers: { supergraph, metadata },
    blobs: [config, supergraph, metadata],
    supergraphSdl: files.get('supergraph/supergraph.graphql'),
    metadata: JSON.parse(files.get('supergraph/metadata.json') ?? 'null') as {
      graphId: string;
      graphVersionId: string;
    } | null,
  };
}

type TarEntry = {
  name: string;
  type: string;
  mode: number;
  uid: number;
  gid: number;
  mtime: number;
  uname: string;
  gname: string;
  content: Buffer;
};

function readTar(archive: Buffer): Array<TarEntry> {
  const entries: Array<TarEntry> = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const field = (start: number, length: number) =>
      header
        .subarray(start, start + length)
        .toString('utf8')
        .replace(/\0.*$/s, '');
    const size = parseInt(field(124, 12), 8);
    entries.push({
      name: field(0, 100),
      mode: parseInt(field(100, 8), 8),
      uid: parseInt(field(108, 8), 8),
      gid: parseInt(field(116, 8), 8),
      mtime: parseInt(field(136, 12), 8),
      type: field(156, 1),
      uname: field(265, 32),
      gname: field(297, 32),
      content: archive.subarray(offset + 512, offset + 512 + size),
    });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Publishes a federated schema with a unique supergraph and pulls its OCI image. */
async function createPublishedImage() {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(ProjectType.Federation);
  const token = await project.createTargetAccessToken({});
  const cdn = await project.createCdnAccess();
  const field = `field_${generateUnique()}`;

  await token
    .publishSchema({
      sdl: `type Query { ${field}: String }`,
      service: 'svc',
      url: 'http://svc.com',
    })
    .then(r => r.expectNoGraphQLErrors());

  const versionId = (await token.fetchLatestValidSchema()).latestValidVersion!.id;
  const version = (await getSchemaVersionWithAllDetails(project.target.id, versionId, ownerToken))!;
  const image = await pullImage({
    targetId: project.target.id,
    tag: supergraphTag('default', versionId),
    cdnAccessToken: cdn.secretAccessToken,
  });

  return { ownerToken, org, project, token, field, versionId, version, cdn, image, tag: image.tag };
}

function lazy<T>(fn: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  return () => (promise ??= fn());
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

describe('image generation', () => {
  test.concurrent(
    'publishing produces a reproducible image of the schema version',
    async ({ expect }) => {
      const { image, version, versionId } = await createPublishedImage();
      const manifest = image.manifest.json;
      const graphId = manifest.annotations['org.hive_console.graph_id'];
      expect(graphId).toMatch(uuidRegex);

      expect(manifest.config.mediaType).toBe('application/vnd.oci.image.config.v1+json');
      // supergraph layer first, metadata layer second
      expect(manifest.layers.map(layer => layer.mediaType)).toEqual([
        'application/vnd.oci.image.layer.v1.tar+gzip',
        'application/vnd.oci.image.layer.v1.tar+gzip',
      ]);
      expect(manifest.annotations).toEqual({
        'org.hive_console.graph_id': graphId,
        'org.hive_console.graph_version_id': versionId,
        'org.opencontainers.image.title': 'supergraph',
      });

      expect(image.config.json.config.Labels).toEqual({
        'org.hive_console.graph_id': graphId,
        'org.hive_console.graph_version_id': versionId,
      });
      // no timestamps, so identical input results in identical bytes
      expect(image.config.json.created).toBeUndefined();
      expect(image.config.json.rootfs).toEqual({
        type: 'layers',
        diff_ids: [image.layers.supergraph, image.layers.metadata].map(layer =>
          sha256Digest(gunzipSync(layer.content)),
        ),
      });

      for (const layer of [image.layers.supergraph, image.layers.metadata]) {
        // gzip: deflate, no flags, mtime 0, OS "unknown" -> platform independent
        expect([...layer.content.subarray(0, 10)]).toEqual([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 2, 0xff]);
        const entries = readTar(gunzipSync(layer.content));
        for (const entry of entries) {
          expect(entry).toMatchObject({
            uid: 0,
            gid: 0,
            mtime: 0,
            uname: 'root',
            gname: 'root',
            mode: entry.type === '5' ? 0o755 : 0o644,
          });
        }
        expect(entries.map(entry => entry.name)).toEqual([
          'supergraph/',
          ...(layer === image.layers.supergraph
            ? ['supergraph/supergraph.graphql']
            : ['supergraph/metadata.json']),
        ]);
      }

      expect(version.supergraph).toBeTruthy();
      expect(image.supergraphSdl).toBe(version.supergraph);
      expect(image.metadata).toEqual({ graphId, graphVersionId: versionId });
    },
  );

  test.concurrent(
    'promotion publishes an image that reuses the supergraph layer of the source version',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject, createOrganizationAccessToken } = await createOrg();
      const { target, fetchVersions, createCdnAccess } = await createProject(
        ProjectType.Federation,
      );
      const cdn = await createCdnAccess();
      const { privateAccessKey } = await createOrganizationAccessToken({
        resources: { mode: ResourceAssignmentModeType.All },
        permissions: ['schemaVersion:publish', 'schemaVersion:promote'],
      });

      await publishSchema(
        {
          author: 'a',
          commit: 'a',
          sdl: `type Query { field_${generateUnique()}: String }`,
          service: 'a',
          url: 'http://a',
          target: { byId: target.id },
        },
        privateAccessKey,
      ).then(r => r.expectNoGraphQLErrors());

      const promoteResult = await schemaVersionPromote(
        {
          source: { fromTarget: { byId: target.id } },
          target: { toTarget: { byId: target.id } },
        },
        privateAccessKey,
      ).then(r => r.expectNoGraphQLErrors());
      expect(promoteResult.schemaVersionPromote.error).toBeNull();

      const [promoted, published] = await fetchVersions(2);
      const [promotedImage, publishedImage] = await Promise.all(
        [promoted, published].map(version =>
          pullImage({
            targetId: target.id,
            tag: supergraphTag('default', version.id),
            cdnAccessToken: cdn.secretAccessToken,
          }),
        ),
      );

      // identical supergraph -> shared, immutable layer blob
      expect(promotedImage.layers.supergraph.descriptor).toEqual(
        publishedImage.layers.supergraph.descriptor,
      );
      expect(promotedImage.supergraphSdl).toBe(published.supergraph);
      // same graph, but version specific metadata layer and manifest
      expect(promotedImage.metadata).toEqual({
        graphId: publishedImage.metadata!.graphId,
        graphVersionId: promoted.id,
      });
      expect(promotedImage.layers.metadata.descriptor.digest).not.toBe(
        publishedImage.layers.metadata.descriptor.digest,
      );
      expect(promotedImage.manifest.descriptor.digest).not.toBe(
        publishedImage.manifest.descriptor.digest,
      );
    },
  );

  test.concurrent(
    'subgraph deletion and contract compositions publish images',
    async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createTargetAccessToken, createCdnAccess, target } = await createProject(
        ProjectType.Federation,
      );
      const token = await createTargetAccessToken({});
      const cdn = await createCdnAccess();

      const createContractResult = await createContract(
        {
          target: { byId: target.id },
          contractName: 'my-contract',
          removeUnreachableTypesFromPublicApiSchema: true,
          includeTags: ['public'],
        },
        ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(createContractResult.createContract.error).toBeNull();

      const suffix = generateUnique();
      for (const service of ['a', 'b']) {
        await token
          .publishSchema({
            sdl: `
              extend schema
                @link(url: "https://specs.apollo.dev/link/v1.0")
                @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

              type Query {
                ${service}_${suffix}: String @tag(name: "public")
              }
            `,
            service,
            url: `http://${service}.com`,
          })
          .then(r => r.expectNoGraphQLErrors());
      }

      const deleteResult = await token.deleteSchema('b').then(r => r.expectNoGraphQLErrors());
      expect(deleteResult.schemaDelete.__typename).toBe('SchemaDeleteSuccess');

      const deleteVersionId = (await token.fetchLatestValidSchema()).latestValidVersion!.id;
      const deleteVersion = (await getSchemaVersionWithAllDetails(
        target.id,
        deleteVersionId,
        ownerToken,
      ))!;
      const deleteImage = await pullImage({
        targetId: target.id,
        tag: supergraphTag('default', deleteVersionId),
        cdnAccessToken: cdn.secretAccessToken,
      });
      expect(deleteImage.supergraphSdl).toBe(deleteVersion.supergraph);
      expect(deleteImage.supergraphSdl).toContain(`a_${suffix}`);
      expect(deleteImage.supergraphSdl).not.toContain(`b_${suffix}`);

      const contractVersions = deleteVersion.contractVersions?.edges.map(edge => edge.node) ?? [];
      expect(contractVersions).toHaveLength(1);
      const [contractVersion] = contractVersions;
      // contracts are tagged by their name
      const contractTag = supergraphTag('my-contract', contractVersion.id);
      const contractImage = await pullImage({
        targetId: target.id,
        tag: contractTag,
        cdnAccessToken: cdn.secretAccessToken,
      });
      expect(contractImage.supergraphSdl).toBe(contractVersion.supergraphSDL);
      expect(contractImage.metadata!.graphVersionId).toBe(contractVersion.id);
      // contracts are separate graphs
      expect(contractImage.metadata!.graphId).toMatch(uuidRegex);
      expect(contractImage.metadata!.graphId).not.toBe(deleteImage.metadata!.graphId);
    },
  );
});

// ---------------------------------------------------------------------------
// OCI Distribution pull API
// ---------------------------------------------------------------------------

describe('OCI pull API', () => {
  // All tests in this block only read, so they share one published image.
  const fixture = lazy(createPublishedImage);

  async function repository() {
    const { project } = await fixture();
    return `${await baseUrl()}/v2/${project.target.id}/supergraph`;
  }

  async function auth() {
    return { authorization: basicAuth((await fixture()).cdn.secretAccessToken) };
  }

  async function errorCode(response: Response) {
    expect(response.headers.get('content-type')).toBe('application/json');
    return (await response.json()).errors[0].code;
  }

  test.concurrent('/v2/ challenges unauthenticated clients', async ({ expect }) => {
    const response = await fetch(`${await baseUrl()}/v2/`);
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="Hive CDN"');
    expect(response.headers.get('docker-distribution-api-version')).toBe('registry/2.0');
    expect(await errorCode(response)).toBe('UNAUTHORIZED');

    for (const path of ['/v2/', '/v2']) {
      const authenticated = await fetch(`${await baseUrl()}${path}`, { headers: await auth() });
      expect(authenticated.status).toBe(200);
      expect(authenticated.headers.get('docker-distribution-api-version')).toBe('registry/2.0');
    }
  });

  test.concurrent('pull manifest by tag', async ({ expect }) => {
    const { image, tag } = await fixture();
    const response = await fetch(`${await repository()}/manifests/${tag}`, {
      headers: await auth(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/vnd.oci.image.manifest.v1+json');
    expect(response.headers.get('docker-content-digest')).toBe(image.manifest.descriptor.digest);
    expect(response.headers.get('content-length')).toBe(String(image.manifest.content.length));
    expect(response.headers.get('etag')).toBe(`"${image.manifest.descriptor.digest}"`);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
    expect(Buffer.from(await response.arrayBuffer()).equals(image.manifest.content)).toBe(true);
  });

  test.concurrent('pull manifest by digest using X-Hive-CDN-Key', async ({ expect }) => {
    const { image, cdn } = await fixture();
    const response = await fetch(
      `${await repository()}/manifests/${image.manifest.descriptor.digest}`,
      { headers: { 'x-hive-cdn-key': cdn.secretAccessToken } },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('docker-content-digest')).toBe(image.manifest.descriptor.digest);
    expect(response.headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
    expect(Buffer.from(await response.arrayBuffer()).equals(image.manifest.content)).toBe(true);
  });

  test.concurrent('HEAD manifest and conditional requests', async ({ expect }) => {
    const { image, tag } = await fixture();
    const head = await fetch(`${await repository()}/manifests/${tag}`, {
      method: 'HEAD',
      headers: await auth(),
    });
    expect(head.status).toBe(200);
    expect(head.headers.get('docker-content-digest')).toBe(image.manifest.descriptor.digest);
    expect(head.headers.get('content-length')).toBe(String(image.manifest.content.length));
    expect(await head.text()).toBe('');

    const notModified = await fetch(
      `${await repository()}/manifests/${image.manifest.descriptor.digest}`,
      {
        headers: {
          ...(await auth()),
          'if-none-match': `"${image.manifest.descriptor.digest}"`,
        },
      },
    );
    expect(notModified.status).toBe(304);
  });

  test.concurrent('unknown manifests', async ({ expect }) => {
    for (const reference of [
      `default-${randomUUID()}`,
      `sha256:${'0'.repeat(64)}`,
      '..%2F..%2Fartifact',
    ]) {
      const response = await fetch(`${await repository()}/manifests/${reference}`, {
        headers: await auth(),
      });
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe('MANIFEST_UNKNOWN');
    }
  });

  test.concurrent('pull blobs', async ({ expect }) => {
    const { image } = await fixture();
    for (const blob of image.blobs) {
      const url = `${await repository()}/blobs/${blob.descriptor.digest}`;

      const response = await fetch(url, { headers: await auth() });
      expect(response.status).toBe(200);
      expect(response.headers.get('docker-content-digest')).toBe(blob.descriptor.digest);
      expect(response.headers.get('content-length')).toBe(String(blob.descriptor.size));
      expect(response.headers.get('accept-ranges')).toBe('bytes');
      expect(response.headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
      // binary content survives unchanged
      expect(Buffer.from(await response.arrayBuffer()).equals(blob.content)).toBe(true);

      const head = await fetch(url, { method: 'HEAD', headers: await auth() });
      expect(head.status).toBe(200);
      expect(head.headers.get('docker-content-digest')).toBe(blob.descriptor.digest);
      expect(head.headers.get('content-length')).toBe(String(blob.descriptor.size));
      expect(await head.text()).toBe('');
    }
  });

  test.concurrent('blob range requests', async ({ expect }) => {
    const { image } = await fixture();
    const layer = image.layers.supergraph;
    const url = `${await repository()}/blobs/${layer.descriptor.digest}`;

    const partial = await fetch(url, { headers: { ...(await auth()), range: 'bytes=0-9' } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get('content-length')).toBe('10');
    expect(partial.headers.get('content-range')).toBe(`bytes 0-9/${layer.descriptor.size}`);
    expect(Buffer.from(await partial.arrayBuffer()).equals(layer.content.subarray(0, 10))).toBe(
      true,
    );

    const unsatisfiable = await fetch(url, {
      headers: { ...(await auth()), range: `bytes=${layer.descriptor.size + 100}-` },
    });
    expect(unsatisfiable.status).toBe(416);
  });

  test.concurrent('unknown and invalid blob digests', async ({ expect }) => {
    const unknown = await fetch(`${await repository()}/blobs/sha256:${'0'.repeat(64)}`, {
      headers: await auth(),
    });
    expect(unknown.status).toBe(404);
    expect(await errorCode(unknown)).toBe('BLOB_UNKNOWN');

    const invalid = await fetch(`${await repository()}/blobs/latest`, { headers: await auth() });
    expect(invalid.status).toBe(400);
    expect(await errorCode(invalid)).toBe('DIGEST_INVALID');
  });

  test.concurrent('missing and malformed credentials', async ({ expect }) => {
    const { tag } = await fixture();
    const url = `${await repository()}/manifests/${tag}`;

    const missing = await fetch(url);
    expect(missing.status).toBe(401);
    expect(missing.headers.get('www-authenticate')).toBe('Basic realm="Hive CDN"');

    for (const authorization of [
      'Basic !!!',
      `Basic ${Buffer.from('no-colon').toString('base64')}`,
      `Basic ${Buffer.from('user:').toString('base64')}`,
      'Bearer foo',
      basicAuth('not-a-cdn-token'),
    ]) {
      const response = await fetch(url, { headers: { authorization } });
      expect(response.status).toBe(401);
      expect(await errorCode(response)).toBe('UNAUTHORIZED');
    }
  });

  test.concurrent('a token of another target is rejected', async ({ expect }) => {
    const { org, tag } = await fixture();
    const other = await org.createProject(ProjectType.Federation);
    const otherCdn = await other.createCdnAccess();
    const headers = { authorization: basicAuth(otherCdn.secretAccessToken) };

    // valid for its own target (manifest unknown, but authenticated) ...
    const own = await fetch(
      `${await baseUrl()}/v2/${other.target.id}/supergraph/manifests/${tag}`,
      { headers },
    );
    expect(own.status).toBe(404);
    // ... but not for this one
    const response = await fetch(`${await repository()}/manifests/${tag}`, { headers });
    expect(response.status).toBe(401);
  });

  test.concurrent('a revoked token is rejected', async ({ expect }) => {
    const { org, tag } = await fixture();
    // separate target, so revoking does not affect the shared fixture token
    const project = await org.createProject(ProjectType.Federation);
    const cdn = await project.createCdnAccess();
    const url = `${await baseUrl()}/v2/${project.target.id}/supergraph/manifests/${tag}`;
    const headers = { authorization: basicAuth(cdn.secretAccessToken) };

    expect((await fetch(url, { headers })).status).toBe(404);

    await project.deleteCdnAccess(cdn.id);

    const response = await fetch(url, { headers });
    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe('UNAUTHORIZED');
  });

  test.concurrent('invalid repository names and push requests', async ({ expect }) => {
    const { project, tag } = await fixture();
    for (const repository of ['not-a-uuid', project.target.id.toUpperCase()]) {
      const response = await fetch(
        `${await baseUrl()}/v2/${repository}/supergraph/manifests/${tag}`,
        {
          headers: await auth(),
        },
      );
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe('NAME_UNKNOWN');
    }

    const push = await fetch(`${await repository()}/manifests/${tag}`, {
      method: 'PUT',
      headers: await auth(),
      body: '{}',
    });
    expect(push.status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// Compatibility with standard OCI tooling
// ---------------------------------------------------------------------------

const ORAS_IMAGE = 'ghcr.io/oras-project/oras:v1.2.0';
const SKOPEO_IMAGE = 'quay.io/skopeo/stable:v1.16.1';

/** Run a CLI container inside the network of the integration docker compose stack. */
async function runContainer(args: {
  image: string;
  cmd: Array<string>;
  entrypoint?: Array<string>;
}): Promise<Buffer> {
  const docker = new Docker();
  const pullStream = await docker.pull(args.image);
  await new Promise<void>((resolve, reject) =>
    docker.modem.followProgress(pullStream as unknown as Stream, (error: Error | null) =>
      error ? reject(error) : resolve(),
    ),
  );

  // stdout and stderr are captured separately, so warnings never corrupt (binary) output.
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdoutChunks: Array<Buffer> = [];
  const stderrChunks: Array<Buffer> = [];
  stdout.on('data', chunk => stdoutChunks.push(chunk));
  stderr.on('data', chunk => stderrChunks.push(chunk));

  const [result, container] = await docker.run(args.image, args.cmd, [stdout, stderr], {
    ...(args.entrypoint ? { Entrypoint: args.entrypoint } : {}),
    HostConfig: { NetworkMode: 'hive' },
  });
  await container.remove();

  if (result.StatusCode !== 0) {
    throw new Error(
      `${args.image} failed (${result.StatusCode}): ${Buffer.concat(stderrChunks).toString('utf8')}`,
    );
  }
  return Buffer.concat(stdoutChunks);
}

// Inside the docker network, the API (and its CDN) is reachable as `server:3001`.
const REGISTRY_HOST = 'server:3001';

// eslint-disable-next-line no-process-env
const skipIfLocal = test.skipIf(process.env.RUN_AGAINST_LOCAL_SERVICES === '1');

skipIfLocal('ORAS fetches the manifest and blobs using a CDN access token', async ({ expect }) => {
  const { image, tag, project, cdn } = await createPublishedImage();
  const reference = `${REGISTRY_HOST}/${project.target.id}/supergraph`;
  const credentials = ['--plain-http', '-u', 'hive', '-p', cdn.secretAccessToken];

  const manifest = await runContainer({
    image: ORAS_IMAGE,
    cmd: ['manifest', 'fetch', ...credentials, `${reference}:${tag}`],
  });
  expect(manifest.equals(image.manifest.content)).toBe(true);

  for (const layer of [image.layers.supergraph, image.layers.metadata]) {
    const blob = await runContainer({
      image: ORAS_IMAGE,
      cmd: [
        'blob',
        'fetch',
        ...credentials,
        '--output',
        '-',
        `${reference}@${layer.descriptor.digest}`,
      ],
    });
    expect(blob.equals(layer.content)).toBe(true);
  }
});

skipIfLocal('skopeo pulls the full image using a CDN access token', async ({ expect }) => {
  const { image, tag, project, cdn, version, versionId } = await createPublishedImage();
  const reference = `docker://${REGISTRY_HOST}/${project.target.id}/supergraph:${tag}`;
  const hex = (digest: string) => digest.slice('sha256:'.length);

  // `skopeo copy` performs a complete pull like a container runtime: auth challenge, manifest,
  // config and layers, verifying every digest. The `dir:` transport stores blobs by digest.
  const output = await runContainer({
    image: SKOPEO_IMAGE,
    entrypoint: ['sh', '-c'],
    cmd: [
      [
        'set -e',
        `skopeo copy --quiet --src-tls-verify=false --src-creds "hive:$CDN_TOKEN" '${reference}' dir:/tmp/image`,
        'echo "---manifest"',
        'cat /tmp/image/manifest.json',
        `echo "---supergraph"`,
        `tar -xzOf /tmp/image/${hex(image.layers.supergraph.descriptor.digest)} supergraph/supergraph.graphql`,
        `echo "---metadata"`,
        `tar -xzOf /tmp/image/${hex(image.layers.metadata.descriptor.digest)} supergraph/metadata.json`,
      ]
        .join('\n')
        .replace('$CDN_TOKEN', cdn.secretAccessToken),
    ],
  }).then(buffer => buffer.toString('utf8'));

  const [, manifest, supergraph, metadata] = output.split(/---(?:manifest|supergraph|metadata)\n/);
  expect(JSON.parse(manifest)).toEqual(JSON.parse(image.manifest.content.toString('utf8')));
  expect(supergraph).toBe(version.supergraph);
  expect(JSON.parse(metadata)).toEqual({
    graphId: image.manifest.json.annotations['org.hive_console.graph_id'],
    graphVersionId: versionId,
  });
});
