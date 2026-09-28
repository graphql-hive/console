import { z } from 'zod';
import {
  CDNAccessTokens,
  CDNAccessTokensQuery,
} from '@/components/target/settings/cdn-access-tokens';
import {
  SchemaContracts,
  SchemaContractsQuery,
} from '@/components/target/settings/schema-contracts';
import { loadQuery, type LoaderContext } from '@/lib/route-utils';
import {
  settingsSections,
  TargetSettingsBaseSchemaSection,
  TargetSettingsBreakingChangesSection,
  TargetSettingsGeneralSection,
  TargetSettingsPage,
  TargetSettingsPage_TargetSettingsQuery,
  TargetSettingsPageQuery,
  TargetSettingsRegistryTokensSection,
  TokensDocument,
  type SettingsSectionId,
} from '@/pages/target-settings';
import { createRoute, redirect } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { targetRoute } from './route';

type SettingsLoader = LoaderContext & {
  params: { organizationSlug: string; projectSlug: string; targetSlug: string };
};

// Awaited: whether the viewer may open settings decides between the page and the target.
async function loadSettings(loader: SettingsLoader) {
  const { organizationSlug, projectSlug, targetSlug } = loader.params;
  const slugs = { organizationSlug, projectSlug, targetSlug };
  const result = await loadQuery(loader, TargetSettingsPageQuery, slugs);
  const project = result.data?.organization?.project;
  if (project?.target?.viewerCanAccessSettings === false) {
    throw redirect({
      to: '/$organizationSlug/$projectSlug/$targetSlug',
      params: slugs,
    });
  }
  return { slugs, target: project?.target, projectType: project?.type };
}

// A section the viewer may not open falls back to the first one they may, else the target.
async function loadSection(loader: SettingsLoader, id: SettingsSectionId) {
  const { slugs, target, projectType } = await loadSettings(loader);
  if (!target || !projectType) {
    return;
  }
  const visible = settingsSections({ target, projectType });
  if (visible.some(section => section.id === id)) {
    return;
  }
  const fallback = visible.at(0);
  if (fallback) {
    throw redirect({ to: fallback.to, params: slugs });
  }
  throw redirect({
    to: '/$organizationSlug/$projectSlug/$targetSlug',
    params: slugs,
  });
}

function selectorOf(loader: SettingsLoader) {
  const { organizationSlug, projectSlug, targetSlug } = loader.params;
  return { organizationSlug, projectSlug, targetSlug };
}

export const targetSettingsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'settings',
  loader: async loader => {
    await loadSettings(loader);
  },
  component: TargetSettingsPage,
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const targetSettingsIndexRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.targetSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.targetSettings, search),
  loader: loader => loadSection(loader, 'general'),
  component: TargetSettingsGeneralSection,
});

export const targetSettingsCdnRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'cdn',
  // The create and delete modals are driven from the URL.
  validateSearch: zodValidator(
    z.object({
      cdn: z.enum(['create', 'delete']).optional(),
      id: z.string().optional(),
    }),
  ),
  loader: loader => {
    void loadQuery(loader, CDNAccessTokensQuery, {
      selector: selectorOf(loader),
      first: 10,
      after: null,
    });
    return loadSection(loader, 'cdn');
  },
  component: CDNAccessTokens,
});

export const targetSettingsRegistryTokenRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'registry-token',
  loader: loader => {
    void loadQuery(loader, TokensDocument, { selector: selectorOf(loader) });
    return loadSection(loader, 'registry-token');
  },
  component: TargetSettingsRegistryTokensSection,
});

export const targetSettingsBreakingChangesRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'breaking-changes',
  loader: loader => {
    const { organizationSlug, projectSlug } = loader.params;
    void loadQuery(loader, TargetSettingsPage_TargetSettingsQuery, {
      selector: selectorOf(loader),
      targetsSelector: { organizationSlug, projectSlug },
      organizationSelector: { organizationSlug },
    });
    return loadSection(loader, 'breaking-changes');
  },
  component: TargetSettingsBreakingChangesSection,
});

export const targetSettingsBaseSchemaRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'base-schema',
  loader: loader => loadSection(loader, 'base-schema'),
  component: TargetSettingsBaseSchemaSection,
});

export const targetSettingsSchemaContractsRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'schema-contracts',
  loader: loader => {
    void loadQuery(loader, SchemaContractsQuery, { selector: selectorOf(loader) });
    return loadSection(loader, 'schema-contracts');
  },
  component: SchemaContracts,
});
