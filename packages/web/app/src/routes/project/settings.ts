import { z } from 'zod';
import {
  ProjectAccessTokensSubPage,
  ProjectAccessTokensSubPage_OrganizationQuery,
} from '@/components/project/settings/access-tokens/project-access-tokens-sub-page';
import { loadQuery, requireLayoutFlag, revalidate, type LoaderContext } from '@/lib/route-utils';
import {
  GithubIntegration_GithubIntegrationDetailsQuery,
  ProjectSettingsCompositionSection,
  ProjectSettingsGeneralSection,
  ProjectSettingsPage,
  ProjectSettingsPageQuery,
  ProjectSettingsPolicySection,
  projectSettingsSections,
  type ProjectSettingsSectionId,
} from '@/pages/project-settings';
import { createRoute, redirect } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { projectRoute } from './route';

type SettingsLoader = LoaderContext & { params: { organizationSlug: string; projectSlug: string } };

// The page document and the layout gate start together; both are awaited.
async function loadSettings(loader: SettingsLoader) {
  const { organizationSlug, projectSlug } = loader.params;
  const slugs = { organizationSlug, projectSlug };
  const page = loadQuery(loader, ProjectSettingsPageQuery, slugs);
  await requireLayoutFlag.project(
    loader,
    'viewerCanModifySettings',
    'viewerCanManageProjectAccessTokens',
  );
  return { slugs, project: (await page).data?.organization?.project };
}

// A section the viewer may not open falls back to the first one they may, else the project.
async function loadSection(loader: SettingsLoader, id: ProjectSettingsSectionId) {
  const { slugs, project } = await loadSettings(loader);
  if (!project) {
    return;
  }
  const visible = projectSettingsSections(project);
  if (visible.some(section => section.id === id)) {
    return;
  }
  const fallback = visible.at(0);
  if (fallback) {
    throw redirect({ to: fallback.to, params: slugs });
  }
  throw redirect({ to: '/$organizationSlug/$projectSlug', params: slugs });
}

export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/settings',
  loader: async loader => {
    await loadSettings(loader);
  },
  component: ProjectSettingsPage,
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const projectSettingsIndexRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.projectSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.projectSettings, search),
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(loader, GithubIntegration_GithubIntegrationDetailsQuery, { organizationSlug });
    return loadSection(loader, 'general');
  },
  component: ProjectSettingsGeneralSection,
});

export const projectSettingsPolicyRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'policy',
  loader: loader => loadSection(loader, 'policy'),
  component: ProjectSettingsPolicySection,
});

export const projectSettingsCompositionRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'composition',
  loader: loader => loadSection(loader, 'composition'),
  component: ProjectSettingsCompositionSection,
});

// Tokens change outside this tab, so the section revalidates on every visit.
export const projectSettingsAccessTokensRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'access-tokens',
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug } = loader.params;
    void loadQuery(
      loader,
      ProjectAccessTokensSubPage_OrganizationQuery,
      { organizationSlug, projectSlug },
      revalidate(loader),
    );
    return loadSection(loader, 'access-tokens');
  },
  component: ProjectAccessTokensSubPage,
});
