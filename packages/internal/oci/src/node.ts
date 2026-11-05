/**
 * Deterministic, in-memory construction of the supergraph OCI image.
 *
 * Nothing in here touches the file system. Identical input always produces identical bytes and
 * therefore identical digests, which allows content addressed storage and layer de-duplication.
 */
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  isSupergraphRepositoryTargetId,
  OciAnnotation,
  OciMediaType,
  SupergraphImagePath,
  type OciDescriptor,
  type OciDigest,
  type SupergraphImageMetadata,
} from './index';

export * from './index';

// ---------------------------------------------------------------------------
// In-memory tar (POSIX ustar) writer
// ---------------------------------------------------------------------------

export type TarEntry =
  | { type: 'file'; name: string; content: Buffer; mode?: number }
  | { type: 'directory'; name: string; mode?: number };

const BLOCK_SIZE = 512;

function writeString(buffer: Buffer, value: string, offset: number, length: number) {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > length) {
    throw new Error(`Tar header field "${value}" exceeds ${length} bytes.`);
  }
  bytes.copy(buffer, offset);
}

function writeOctal(buffer: Buffer, value: number, offset: number, length: number) {
  // Octal digits, zero padded, terminated by a NUL byte.
  const octal = value.toString(8).padStart(length - 1, '0');
  if (octal.length > length - 1) {
    throw new Error(`Tar header numeric value ${value} does not fit into ${length} bytes.`);
  }
  writeString(buffer, octal + '\0', offset, length);
}

function createTarHeader(entry: TarEntry): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE, 0);
  const isDirectory = entry.type === 'directory';
  const name = isDirectory && !entry.name.endsWith('/') ? `${entry.name}/` : entry.name;
  const size = entry.type === 'file' ? entry.content.length : 0;

  writeString(header, name, 0, 100); // name
  writeOctal(header, entry.mode ?? (isDirectory ? 0o755 : 0o644), 100, 8); // mode
  writeOctal(header, 0, 108, 8); // uid
  writeOctal(header, 0, 116, 8); // gid
  writeOctal(header, size, 124, 12); // size
  writeOctal(header, 0, 136, 12); // mtime (epoch for reproducible builds)
  header.fill(' ', 148, 156); // checksum placeholder (spaces while computing)
  writeString(header, isDirectory ? '5' : '0', 156, 1); // typeflag
  writeString(header, 'ustar\0', 257, 6); // magic
  writeString(header, '00', 263, 2); // version
  writeString(header, 'root', 265, 32); // uname
  writeString(header, 'root', 297, 32); // gname

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  // checksum: 6 octal digits, NUL, space
  writeString(header, checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);

  return header;
}

/** Creates a tar archive. Entries are written in the given order. */
export function createTar(entries: Array<TarEntry>): Buffer {
  const chunks: Buffer[] = [];

  for (const entry of entries) {
    chunks.push(createTarHeader(entry));

    if (entry.type === 'file') {
      chunks.push(entry.content);
      const padding = (BLOCK_SIZE - (entry.content.length % BLOCK_SIZE)) % BLOCK_SIZE;
      if (padding > 0) {
        chunks.push(Buffer.alloc(padding, 0));
      }
    }
  }

  // End of archive: two empty blocks.
  chunks.push(Buffer.alloc(BLOCK_SIZE * 2, 0));

  return Buffer.concat(chunks);
}

/**
 * Deterministic gzip. Node.js writes `mtime: 0` and no file name, the only platform dependent
 * header byte is the OS identifier, which we pin to "unknown" (255).
 */
export function gzipDeterministic(content: Buffer): Buffer {
  const compressed = gzipSync(content, { level: 9, memLevel: 9, strategy: 0 });
  compressed[9] = 0xff;
  return compressed;
}

// ---------------------------------------------------------------------------
// Digests and blobs
// ---------------------------------------------------------------------------

export function sha256Hex(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function sha256Digest(content: Buffer): OciDigest {
  return `sha256:${sha256Hex(content)}`;
}

export type OciBlob = {
  descriptor: OciDescriptor;
  content: Buffer;
};

export function createBlob(mediaType: string, content: Buffer): OciBlob {
  return {
    descriptor: {
      mediaType,
      digest: sha256Digest(content),
      size: content.length,
    },
    content,
  };
}

export function createJsonBlob(mediaType: string, value: unknown): OciBlob {
  return createBlob(mediaType, Buffer.from(JSON.stringify(value), 'utf8'));
}

type Layer = {
  blob: OciBlob;
  /** Digest of the uncompressed tar, referenced from the image config `rootfs.diff_ids`. */
  diffId: OciDigest;
};

function createLayer(entries: Array<TarEntry>): Layer {
  const tar = createTar(entries);
  return {
    blob: createBlob(OciMediaType.layerTarGzip, gzipDeterministic(tar)),
    diffId: sha256Digest(tar),
  };
}

// ---------------------------------------------------------------------------
// Supergraph image
// ---------------------------------------------------------------------------

export type SupergraphImage = {
  manifest: OciBlob;
  config: OciBlob;
  layers: {
    /** Only contains `supergraph/supergraph.graphql`, shared by versions with identical SDL. */
    supergraph: OciBlob;
    /** Only contains `supergraph/metadata.json`, specific to a graph version. */
    metadata: OciBlob;
  };
  /** All blobs referenced by the manifest (layers and config), in upload order. */
  blobs: Array<OciBlob>;
};

export function serializeSupergraphImageMetadata(metadata: SupergraphImageMetadata): Buffer {
  const value: SupergraphImageMetadata = {
    graphId: metadata.graphId,
    graphVersionId: metadata.graphVersionId,
  };
  return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function buildSupergraphImage(args: {
  supergraphSdl: string;
  graphId: string;
  graphVersionId: string;
}): SupergraphImage {
  const directory: TarEntry = { type: 'directory', name: SupergraphImagePath.directory };

  const supergraphLayer = createLayer([
    directory,
    {
      type: 'file',
      name: SupergraphImagePath.supergraph,
      content: Buffer.from(args.supergraphSdl, 'utf8'),
    },
  ]);

  const metadataLayer = createLayer([
    directory,
    {
      type: 'file',
      name: SupergraphImagePath.metadata,
      content: serializeSupergraphImageMetadata({
        graphId: args.graphId,
        graphVersionId: args.graphVersionId,
      }),
    },
  ]);

  const labels = {
    [OciAnnotation.graphId]: args.graphId,
    [OciAnnotation.graphVersionId]: args.graphVersionId,
  };

  // No `created` timestamps, so identical input results in an identical config digest.
  const config = createJsonBlob(OciMediaType.imageConfig, {
    architecture: 'amd64',
    os: 'linux',
    config: {
      Labels: labels,
    },
    rootfs: {
      type: 'layers',
      diff_ids: [supergraphLayer.diffId, metadataLayer.diffId],
    },
    history: [
      { created_by: 'graphql-hive', comment: SupergraphImagePath.supergraph },
      { created_by: 'graphql-hive', comment: SupergraphImagePath.metadata },
    ],
  });

  const manifest = createJsonBlob(OciMediaType.imageManifest, {
    schemaVersion: 2,
    mediaType: OciMediaType.imageManifest,
    config: config.descriptor,
    layers: [supergraphLayer.blob.descriptor, metadataLayer.blob.descriptor],
    annotations: {
      ...labels,
      [OciAnnotation.title]: 'supergraph',
    },
  });

  return {
    manifest,
    config,
    layers: {
      supergraph: supergraphLayer.blob,
      metadata: metadataLayer.blob,
    },
    blobs: [supergraphLayer.blob, metadataLayer.blob, config],
  };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** UUID length (36) plus the `-` separator. */
const VERSION_SUFFIX_LENGTH = 37;
/** Graph names that can be used verbatim. Intentionally excludes `.` (see below). */
const plainGraphNameRegex = new RegExp(
  `^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,${128 - VERSION_SUFFIX_LENGTH - 1}}$`,
);

/**
 * Encodes the graph name for usage within an OCI tag.
 *
 * Names that are valid tag characters (without `.`) and short enough are used verbatim. All
 * other names are replaced with `sha256.<hash>`. Because verbatim names never contain a `.`,
 * an encoded name can never collide with a verbatim one.
 */
export function encodeGraphNameForTag(graphName: string): string {
  if (plainGraphNameRegex.test(graphName)) {
    return graphName;
  }
  return `sha256.${sha256Hex(graphName).slice(0, 32)}`;
}

/** Tag of a supergraph image: `<graph-name>-<graph-version-id>`. */
export function buildSupergraphTag(graphName: string, graphVersionId: string): string {
  if (!isSupergraphRepositoryTargetId(graphVersionId)) {
    throw new Error(`Invalid graph version id "${graphVersionId}".`);
  }
  return `${encodeGraphNameForTag(graphName)}-${graphVersionId.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// OCI image layout archive (used by the local CLI script)
// ---------------------------------------------------------------------------

function blobPath(descriptor: OciDescriptor): string {
  return `blobs/sha256/${descriptor.digest.slice('sha256:'.length)}`;
}

/**
 * Assembles an OCI image layout tarball (`oci-layout`, `index.json`, `blobs/sha256/*`) that
 * additionally contains a Docker compatible `manifest.json`, so it can be consumed by
 * `docker load`, `skopeo copy oci-archive:` or `crane push`.
 */
export function createOciImageLayoutArchive(image: SupergraphImage, reference: string): Buffer {
  const index = {
    schemaVersion: 2,
    mediaType: OciMediaType.imageIndex,
    manifests: [
      {
        ...image.manifest.descriptor,
        annotations: {
          'org.opencontainers.image.ref.name': reference.split(':').at(-1) ?? 'latest',
          'io.containerd.image.name': reference,
        },
      },
    ],
  };

  const dockerManifest = [
    {
      Config: blobPath(image.config.descriptor),
      RepoTags: [reference],
      Layers: [image.layers.supergraph, image.layers.metadata].map(layer =>
        blobPath(layer.descriptor),
      ),
    },
  ];

  return createTar([
    {
      type: 'file',
      name: 'oci-layout',
      content: Buffer.from(JSON.stringify({ imageLayoutVersion: '1.0.0' }), 'utf8'),
    },
    { type: 'file', name: 'index.json', content: Buffer.from(JSON.stringify(index), 'utf8') },
    {
      type: 'file',
      name: 'manifest.json',
      content: Buffer.from(JSON.stringify(dockerManifest), 'utf8'),
    },
    { type: 'directory', name: 'blobs' },
    { type: 'directory', name: 'blobs/sha256' },
    ...[...image.blobs, image.manifest].map(blob => ({
      type: 'file' as const,
      name: blobPath(blob.descriptor),
      content: blob.content,
    })),
  ]);
}
