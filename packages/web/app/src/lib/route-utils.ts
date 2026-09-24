import { z } from 'zod';

/**
 * Remove null and undefined values from an object before writing to URL search params.
 *
 * Null values in search params (e.g. `versions: null`) trigger Cloudflare security rules
 * and bloat the URL. Zod schemas with `.nullable().default(null)` automatically restore
 * omitted keys to null during route validation, so it's safe to strip them here.
 *
 * @example
 * // { name: "Hive CLI" } — versions stripped, Zod restores it as null
 * stripNullValues({ name: "Hive CLI", versions: null })
 *
 * // { name: "Hive CLI", versions: ["v1"] } — versions kept
 * stripNullValues({ name: "Hive CLI", versions: ["v1"] })
 */
export function stripNullValues<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) as T;
}

/**
 * A path on this app: starts with `/` and is not protocol-relative (`//host` or its `/\host`
 * spelling, which browsers read the same way). Anything else could carry a user to another site.
 */
export function isSafeRedirectPath(value: string): boolean {
  return /^\/(?![/\\])/.test(value);
}

/**
 * `redirectToPath` arrives in the URL, so whoever wrote the link controls it. Validate it here,
 * once, and every page and redirect downstream gets a path on this app or the home page; a
 * hostile link degrades quietly instead of erroring or leaving the site.
 */
export const redirectToPathSchema = z
  .string()
  .optional()
  .transform(value => (value !== undefined && isSafeRedirectPath(value) ? value : '/'));
