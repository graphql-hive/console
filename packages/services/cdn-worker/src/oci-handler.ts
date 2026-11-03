/**
 * OCI Distribution (pull only) API for supergraph images.
 *
 *   GET  /v2/
 *   GET  /v2/<target-id>/supergraph/manifests/<tag-or-digest>
 *   HEAD /v2/<target-id>/supergraph/manifests/<tag-or-digest>
 *   GET  /v2/<target-id>/supergraph/blobs/<digest>
 *   HEAD /v2/<target-id>/supergraph/blobs/<digest>
 *
 * Authentication uses the existing target scoped CDN access tokens, either via
 * `X-Hive-CDN-Key: <token>` or `Authorization: Basic base64(<any-username>:<token>)`, so that
 * standard tooling (Docker, Crane, ORAS, containerd) can use a CDN token as the password.
 *
 * @see https://github.com/opencontainers/distribution-spec/blob/main/spec.md
 */
import {
  isOciDigest,
  isOciTag,
  isSupergraphRepositoryTargetId,
  OciMediaType,
  OciStorageKey,
  SUPERGRAPH_REPOSITORY_NAME,
  type OciDigest,
} from '@hive/oci';
import { createAnalytics, type Analytics } from './analytics';
import type { ArtifactStorageReader } from './artifact-storage-reader';
import { createBreadcrumb, type Breadcrumb } from './breadcrumbs';
import type { KeyValidator } from './key-validation';
import { createResponse } from './tracked-response';

export type OciRequestHandlerDeps = {
  isKeyValid: KeyValidator;
  storage: Pick<ArtifactStorageReader, 'readOciObject'>;
  analytics?: Analytics;
  breadcrumb?: Breadcrumb;
};

const AUTH_HEADER_NAME = 'x-hive-cdn-key';
const REALM = 'Hive CDN';
const DISTRIBUTION_API_VERSION = 'registry/2.0';

/** Content addressed responses never change. `private`, since every request is authenticated. */
const CACHE_CONTROL_IMMUTABLE = 'private, max-age=31536000, immutable';
/** Tags are deterministic (`<graph-name>-<graph-version-id>`) but may not exist yet. */
const CACHE_CONTROL_TAG = 'private, max-age=300';
const CACHE_CONTROL_NONE = 'no-store';

type OciErrorCode =
  | 'BLOB_UNKNOWN'
  | 'DIGEST_INVALID'
  | 'MANIFEST_UNKNOWN'
  | 'NAME_INVALID'
  | 'NAME_UNKNOWN'
  | 'UNAUTHORIZED'
  | 'DENIED'
  | 'UNSUPPORTED';

const routeRegex = new RegExp(
  `^/v2/([^/]+)/${SUPERGRAPH_REPOSITORY_NAME}/(manifests|blobs)/([^/]+)$`,
);

type ParsedRoute =
  | { type: 'base' }
  | { type: 'manifest' | 'blob'; targetId: string; reference: string }
  | { type: 'unknown' };

function parseRoute(pathname: string): ParsedRoute {
  if (pathname === '/v2' || pathname === '/v2/') {
    return { type: 'base' };
  }

  const match = routeRegex.exec(pathname);
  if (!match) {
    return { type: 'unknown' };
  }

  let reference: string;
  try {
    reference = decodeURIComponent(match[3]);
  } catch {
    return { type: 'unknown' };
  }

  return {
    type: match[2] === 'manifests' ? 'manifest' : 'blob',
    targetId: match[1],
    reference,
  };
}

/** Extract the CDN access token from `X-Hive-CDN-Key` or Basic authentication. */
export function extractAccessToken(request: Request): string | null {
  const headerKey = request.headers.get(AUTH_HEADER_NAME);
  if (headerKey) {
    return headerKey;
  }

  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return null;
  }

  const [scheme, value] = authorization.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'basic' || !value) {
    return null;
  }

  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)));
  } catch {
    return null;
  }

  // The username is ignored, the password is the CDN access token.
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }
  const password = decoded.slice(separatorIndex + 1);
  return password.length ? password : null;
}

async function sha256Digest(content: ArrayBuffer): Promise<OciDigest> {
  const hash = await crypto.subtle.digest('SHA-256', content);
  const hex = Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex}`;
}

function etagMatches(request: Request, etag: string) {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (!ifNoneMatch) {
    return false;
  }
  return ifNoneMatch
    .split(',')
    .map(value => value.trim().replace(/^W\//, ''))
    .some(value => value === etag || value === '*');
}

/** Whether the path targets the OCI Distribution API (`/v2/...`). */
export function isOciPath(pathname: string) {
  return pathname === '/v2' || pathname.startsWith('/v2/');
}

/** Whether the request targets the OCI Distribution API (`/v2/...`). */
export function isOciRequest(request: Request) {
  return isOciPath(new URL(request.url).pathname);
}

export function createOciRequestHandler(deps: OciRequestHandlerDeps) {
  const analytics = deps.analytics ?? createAnalytics();
  const breadcrumb = deps.breadcrumb ?? createBreadcrumb();

  function respond(
    request: Request,
    targetId: string,
    body: BodyInit | null,
    status: number,
    headers: Record<string, string>,
  ) {
    return createResponse(
      analytics,
      request.method === 'HEAD' ? null : body,
      {
        status,
        headers: {
          'docker-distribution-api-version': DISTRIBUTION_API_VERSION,
          ...headers,
        },
      },
      targetId,
      request,
    );
  }

  function error(
    request: Request,
    targetId: string,
    status: number,
    code: OciErrorCode,
    message: string,
    extraHeaders: Record<string, string> = {},
  ) {
    const body = JSON.stringify({ errors: [{ code, message, detail: null }] });
    return respond(request, targetId, body, status, {
      'content-type': 'application/json',
      'cache-control': CACHE_CONTROL_NONE,
      ...extraHeaders,
    });
  }

  function unauthorized(request: Request, targetId: string, code: OciErrorCode, message: string) {
    return error(request, targetId, 401, code, message, {
      'www-authenticate': `Basic realm="${REALM}"`,
    });
  }

  async function authenticate(request: Request, targetId: string): Promise<Response | null> {
    const token = extractAccessToken(request);
    if (!token) {
      return unauthorized(request, targetId, 'UNAUTHORIZED', 'Authentication required.');
    }

    try {
      if (await deps.isKeyValid(targetId, token)) {
        return null;
      }
    } catch (e) {
      breadcrumb(`Failed to validate key for ${targetId}, error: ${e}`);
      console.warn(`Failed to validate key for ${targetId}, error:`, e);
    }

    return unauthorized(request, targetId, 'UNAUTHORIZED', 'Invalid access token.');
  }

  async function resolveManifestDigest(
    targetId: string,
    reference: string,
  ): Promise<{ digest: OciDigest; isTag: boolean } | null> {
    if (isOciDigest(reference)) {
      return { digest: reference, isTag: false };
    }

    const tagObject = await deps.storage.readOciObject(OciStorageKey.tag(targetId, reference), {
      targetId,
      method: 'GET',
    });
    if (tagObject.type !== 'ok' || !tagObject.body) {
      return null;
    }

    const digest = new TextDecoder().decode(tagObject.body).trim();
    if (!isOciDigest(digest)) {
      throw new Error(`Tag object contains an invalid digest (targetId=${targetId}).`);
    }
    return { digest, isTag: true };
  }

  async function handleManifest(request: Request, targetId: string, reference: string) {
    if (!isOciDigest(reference) && !isOciTag(reference)) {
      return error(request, targetId, 404, 'MANIFEST_UNKNOWN', 'Manifest unknown.');
    }

    analytics.track({ type: 'artifact', version: 'oci', value: 'oci-manifest' }, targetId);

    const resolved = await resolveManifestDigest(targetId, reference);
    if (!resolved) {
      return error(request, targetId, 404, 'MANIFEST_UNKNOWN', 'Manifest unknown.');
    }

    const manifest = await deps.storage.readOciObject(
      OciStorageKey.manifest(targetId, resolved.digest),
      { targetId, method: 'GET' },
    );
    if (manifest.type !== 'ok' || !manifest.body) {
      return error(request, targetId, 404, 'MANIFEST_UNKNOWN', 'Manifest unknown.');
    }

    // Never serve content that does not match the digest it is addressed by.
    if ((await sha256Digest(manifest.body)) !== resolved.digest) {
      throw new Error(`Manifest digest mismatch (targetId=${targetId}).`);
    }

    const etag = `"${resolved.digest}"`;
    const headers = {
      'content-type': OciMediaType.imageManifest,
      'docker-content-digest': resolved.digest,
      'content-length': String(manifest.body.byteLength),
      etag,
      'cache-control': resolved.isTag ? CACHE_CONTROL_TAG : CACHE_CONTROL_IMMUTABLE,
    };

    if (etagMatches(request, etag)) {
      const { 'content-length': _, 'content-type': __, ...notModifiedHeaders } = headers;
      return respond(request, targetId, null, 304, notModifiedHeaders);
    }

    return respond(request, targetId, manifest.body, 200, headers);
  }

  async function handleBlob(request: Request, targetId: string, reference: string) {
    if (!isOciDigest(reference)) {
      return error(request, targetId, 400, 'DIGEST_INVALID', 'Invalid digest.');
    }

    analytics.track({ type: 'artifact', version: 'oci', value: 'oci-blob' }, targetId);

    const etag = `"${reference}"`;
    const baseHeaders = {
      'docker-content-digest': reference,
      etag,
      'cache-control': CACHE_CONTROL_IMMUTABLE,
      'accept-ranges': 'bytes',
    };

    if (etagMatches(request, etag)) {
      return respond(request, targetId, null, 304, baseHeaders);
    }

    const blob = await deps.storage.readOciObject(OciStorageKey.blob(reference), {
      targetId,
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      range: request.method === 'GET' ? request.headers.get('range') : null,
    });

    if (blob.type === 'notFound') {
      return error(request, targetId, 404, 'BLOB_UNKNOWN', 'Blob unknown.');
    }

    if (blob.type === 'rangeNotSatisfiable') {
      const contentRange = blob.headers.get('content-range');
      return respond(request, targetId, null, 416, {
        ...baseHeaders,
        ...(contentRange ? { 'content-range': contentRange } : {}),
      });
    }

    const contentLength = blob.body
      ? String(blob.body.byteLength)
      : blob.headers.get('content-length');
    const contentRange = blob.status === 206 ? blob.headers.get('content-range') : null;

    return respond(request, targetId, blob.body, blob.status, {
      ...baseHeaders,
      'content-type': 'application/octet-stream',
      ...(contentLength ? { 'content-length': contentLength } : {}),
      ...(contentRange ? { 'content-range': contentRange } : {}),
    });
  }

  return async function handleOciRequest(request: Request): Promise<Response> {
    const route = parseRoute(new URL(request.url).pathname);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return error(request, 'unknown', 405, 'UNSUPPORTED', 'Only pulling images is supported.', {
        allow: 'GET, HEAD',
      });
    }

    if (route.type === 'base') {
      // There is no global credential, CDN access tokens are scoped to a target.
      // Return the challenge if no credential is sent, so clients send it on subsequent requests.
      if (!extractAccessToken(request)) {
        return unauthorized(request, 'unknown', 'UNAUTHORIZED', 'Authentication required.');
      }
      return respond(request, 'unknown', '{}', 200, {
        'content-type': 'application/json',
        'cache-control': CACHE_CONTROL_NONE,
      });
    }

    if (route.type === 'unknown') {
      return error(request, 'unknown', 404, 'NAME_UNKNOWN', 'Repository name not known.');
    }

    if (
      !isSupergraphRepositoryTargetId(route.targetId) ||
      route.targetId !== route.targetId.toLowerCase()
    ) {
      return error(request, 'unknown', 404, 'NAME_UNKNOWN', 'Repository name not known.');
    }

    const authError = await authenticate(request, route.targetId);
    if (authError) {
      return authError;
    }

    breadcrumb(
      `OCI ${request.method} ${route.type} (targetId=${route.targetId}, reference=${route.reference})`,
    );

    if (route.type === 'manifest') {
      return handleManifest(request, route.targetId, route.reference);
    }
    return handleBlob(request, route.targetId, route.reference);
  };
}
