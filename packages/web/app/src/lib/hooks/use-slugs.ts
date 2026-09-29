import { getRouteApi } from '@tanstack/react-router';

type Scope = 'organization' | 'project' | 'target';

type Slugs = {
  organization: { organizationSlug: string };
  project: { organizationSlug: string; projectSlug: string };
  target: { organizationSlug: string; projectSlug: string; targetSlug: string };
};

const routes = {
  organization: getRouteApi('/authenticated/with-header/$organizationSlug'),
  project: getRouteApi('/authenticated/with-header/$organizationSlug/$projectSlug'),
  target: getRouteApi('/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug'),
};

/**
 * The slugs of the page you are on, from the URL. Generic so the result is the scope you asked for and not a union of all three: without it
 * `useSlugs('target').targetSlug` would not type-check.
 */
export function useSlugs<S extends Scope>(scope: S): Slugs[S] {
  return routes[scope].useParams() as Slugs[S];
}
