import zod from 'zod';
import { type AppDeploymentStatus, type ArtifactStorageReader } from './artifact-storage-reader';

const AppDeploymentIsEnabledKeyModel = zod.tuple([
  zod.string().uuid(),
  zod.string().min(1),
  zod.string().min(1),
]);

type GetCache = () => Promise<Cache | null>;
type WaitUntil = (promise: Promise<void>) => void;

export type { AppDeploymentStatus };

export type GetAppDeploymentStatus = (
  targetId: string,
  appName: string,
  appVersion: string,
) => Promise<AppDeploymentStatus>;

/** Check app deployment status, including format. Optionally caches to avoid S3 access. */
export function createGetAppDeploymentStatus(deps: {
  artifactStorageReader: ArtifactStorageReader;
  waitUntil: null | WaitUntil;
  getCache: null | GetCache;
}): GetAppDeploymentStatus {
  return async function getAppDeploymentStatus(
    ...args: [targetId: string, appName: string, appVersion: string]
  ): Promise<AppDeploymentStatus> {
    const [targetId, appName, appVersion] = AppDeploymentIsEnabledKeyModel.parse(args);
    const cache = await (deps.getCache ? deps.getCache() : null);
    const cacheKey = new Request(
      [
        'http://key-cache.graphql-hive.com',
        'v1',
        targetId,
        'apps-enabled',
        appName,
        appVersion,
      ].join('/'),
      {
        method: 'GET',
      },
    );

    if (cache) {
      const response = await cache.match(cacheKey);

      if (response) {
        const responseValue = await response.text();
        return parseStatus(responseValue);
      }
    }

    const status = await deps.artifactStorageReader.getAppDeploymentStatus(
      targetId,
      appName,
      appVersion,
    );

    if (cache) {
      // Cache the raw value: 'custom', 'sha256' for enabled, '0' for disabled
      const cacheValue = status.enabled ? status.format : '0';
      const promise = cache.put(
        cacheKey,
        new Response(cacheValue, {
          status: 200,
          headers: {
            'Cache-Control': `s-maxage=${60 * 5}`,
          },
        }),
      );

      if (deps.waitUntil) {
        deps.waitUntil(promise);
      } else {
        await promise;
      }
    }

    return status;
  };
}

function parseStatus(value: string): AppDeploymentStatus {
  if (value === '0' || value.includes('-inactive')) {
    return { enabled: false };
  }
  // 'sha256' = active sha256, 'custom' or '1' or anything else = active custom (backward compat)
  return { enabled: true, format: value === 'sha256' ? 'sha256' : 'custom' };
}
