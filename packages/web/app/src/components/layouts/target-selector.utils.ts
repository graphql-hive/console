export const TARGET_ROUTE_PREFIX = '/$organizationSlug/$projectSlug/$targetSlug';

/**
 * Where the target switcher lands when moving to another target: the current section without the
 * old target's resource ids, so the new section can resolve its own default.
 */
export function resolveTargetSwitchTo(
  matchedFullPaths: ReadonlyArray<string | undefined>,
  allRoutePaths: Iterable<string>,
): string {
  let sectionTo = TARGET_ROUTE_PREFIX;
  let leafFullPath = TARGET_ROUTE_PREFIX;
  for (const fullPath of matchedFullPaths) {
    if (!fullPath?.startsWith(TARGET_ROUTE_PREFIX)) continue;
    leafFullPath = fullPath;
    if (!fullPath.slice(TARGET_ROUTE_PREFIX.length).includes('$')) {
      sectionTo = fullPath;
    }
  }
  // Flat detail routes (e.g. /trace/$traceId) have no section parent in the match chain; recover
  // the section from the leaf's first segment when it is a real route.
  if (sectionTo === TARGET_ROUTE_PREFIX) {
    const [, firstSegment] = leafFullPath.slice(TARGET_ROUTE_PREFIX.length).split('/');
    const candidate = `${TARGET_ROUTE_PREFIX}/${firstSegment}`;
    if (firstSegment && new Set(allRoutePaths).has(candidate)) {
      sectionTo = candidate;
    }
  }
  return sectionTo !== TARGET_ROUTE_PREFIX && sectionTo.endsWith('/')
    ? sectionTo.slice(0, -1) // target index route has a trailing slash
    : sectionTo;
}
