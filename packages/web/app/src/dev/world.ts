/**
 * The fixed set of organizations, projects and targets that exist in mock mode.
 * Slugs in URLs resolve to these; anything else is created on first sight.
 */
export const WORLD = {
  organizations: [{ slug: 'acme' }, { slug: 'globex' }],
  projects: [{ slug: 'api' }, { slug: 'storefront' }],
  targets: [{ slug: 'production' }, { slug: 'staging' }, { slug: 'development' }],
} as const;
