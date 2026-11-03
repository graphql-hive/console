import { lookupOidcId, type OidcIdLookupResult } from '@/lib/auth/api';

const CACHE_PREFIX = 'hive:oidc-lookup:';

function cacheKey(slug: string): string {
  return `${CACHE_PREFIX}${slug}`;
}

function readCached(slug: string): OidcIdLookupResult | undefined {
  try {
    const raw = sessionStorage.getItem(cacheKey(slug));
    if (raw === null) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }
    const { ok, id, status } = parsed as Record<string, unknown>;
    if (ok === true && typeof id === 'string') {
      return { ok, id };
    }
    if (ok === false && typeof status === 'number') {
      return parsed as OidcIdLookupResult;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function writeCached(slug: string, result: OidcIdLookupResult): void {
  try {
    sessionStorage.setItem(cacheKey(slug), JSON.stringify(result));
  } catch {}
}

function isDurable(result: OidcIdLookupResult): boolean {
  return result.ok || result.status === 404;
}

// One request per slug per tab: the lookup endpoint is rate limited per IP.
export async function resolveOidcId(slug: string): Promise<OidcIdLookupResult> {
  const cached = readCached(slug);
  if (cached) {
    return cached;
  }
  const result = await lookupOidcId({ slug });
  if (isDurable(result)) {
    writeCached(slug, result);
  }
  return result;
}
