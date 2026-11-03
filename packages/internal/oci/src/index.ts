/**
 * Runtime agnostic OCI primitives shared by the workflow service (image generation) and the CDN
 * (OCI Distribution pull API). This module must not depend on Node.js built-ins, as it is bundled
 * into the Cloudflare Worker. Image construction lives in `@hive/oci/node`.
 */

export const OciMediaType = {
  imageIndex: 'application/vnd.oci.image.index.v1+json',
  imageManifest: 'application/vnd.oci.image.manifest.v1+json',
  imageConfig: 'application/vnd.oci.image.config.v1+json',
  layerTarGzip: 'application/vnd.oci.image.layer.v1.tar+gzip',
} as const;

/** Labels (image config) and annotations (image manifest) carrying the graph identity. */
export const OciAnnotation = {
  graphId: 'org.hive_console.graph_id',
  graphVersionId: 'org.hive_console.graph_version_id',
  title: 'org.opencontainers.image.title',
} as const;

export type OciDigest = `sha256:${string}`;

export type OciDescriptor = {
  mediaType: string;
  digest: OciDigest;
  size: number;
  annotations?: Record<string, string>;
};

/**
 * Paths inside the image filesystem. The image is meant to be mounted, e.g. as a Kubernetes image
 * volume, which results in `/supergraph/supergraph.graphql` and `/supergraph/metadata.json`.
 */
export const SupergraphImagePath = {
  directory: 'supergraph',
  supergraph: 'supergraph/supergraph.graphql',
  metadata: 'supergraph/metadata.json',
} as const;

/** Contents of `/supergraph/metadata.json`. This is the stable router integration contract. */
export type SupergraphImageMetadata = {
  graphId: string;
  graphVersionId: string;
};

const digestRegex = /^sha256:[a-f0-9]{64}$/;
// https://github.com/opencontainers/distribution-spec/blob/main/spec.md#pulling-manifests
const tagRegex = /^[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOciDigest(value: string): value is OciDigest {
  return digestRegex.test(value);
}

export function isOciTag(value: string): boolean {
  return tagRegex.test(value);
}

export function isSupergraphRepositoryTargetId(value: string): boolean {
  return uuidRegex.test(value);
}

/** Path prefix of all supergraph repositories: `supergraph/<target-id>`. */
export const SUPERGRAPH_REPOSITORY_NAMESPACE = 'supergraph';

export function buildSupergraphRepositoryName(targetId: string): string {
  assertTargetId(targetId);
  return `${SUPERGRAPH_REPOSITORY_NAMESPACE}/${targetId}`;
}

function digestHex(digest: string): string {
  if (!isOciDigest(digest)) {
    throw new Error(`Invalid OCI digest "${digest}".`);
  }
  return digest.slice('sha256:'.length);
}

function assertTargetId(targetId: string) {
  if (!isSupergraphRepositoryTargetId(targetId)) {
    throw new Error(`Invalid target id "${targetId}".`);
  }
}

/**
 * Object storage keys. Immutable content is stored by digest, mutable repository references
 * (tags) are stored separately and point to an immutable manifest digest.
 */
export const OciStorageKey = {
  /** Content addressed blob (layers and image configs), shared across all repositories. */
  blob(digest: string): string {
    return `oci/blobs/sha256/${digestHex(digest)}`;
  },
  /** Image manifest of a repository, addressed by digest. */
  manifest(targetId: string, digest: string): string {
    return `oci/repositories/${buildSupergraphRepositoryName(targetId)}/manifests/sha256/${digestHex(digest)}`;
  },
  /** Tag reference of a repository. The object body is the manifest digest. */
  tag(targetId: string, tag: string): string {
    if (!isOciTag(tag)) {
      throw new Error(`Invalid OCI tag "${tag}".`);
    }
    return `oci/repositories/${buildSupergraphRepositoryName(targetId)}/tags/${tag}`;
  },
};
