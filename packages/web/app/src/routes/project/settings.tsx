import { z } from 'zod';
import { ProjectAccessTokensSubPage } from '@/components/project/settings/access-tokens/project-access-tokens-sub-page';
import {
  ProjectSettingsCompositionSection,
  ProjectSettingsGeneralSection,
  ProjectSettingsPage,
  ProjectSettingsPolicySection,
} from '@/pages/project-settings';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { projectRoute } from './route';

export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/settings',
  component: function ProjectSettingsRoute() {
    const params = projectSettingsRoute.useParams();
    return <ProjectSettingsPage {...params} />;
  },
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const projectSettingsIndexRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.projectSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.projectSettings, search.page),
  component: function ProjectSettingsIndexRoute() {
    const params = projectSettingsIndexRoute.useParams();
    return <ProjectSettingsGeneralSection {...params} />;
  },
});

export const projectSettingsPolicyRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'policy',
  component: function ProjectSettingsPolicyRoute() {
    const params = projectSettingsPolicyRoute.useParams();
    return <ProjectSettingsPolicySection {...params} />;
  },
});

export const projectSettingsCompositionRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'composition',
  component: function ProjectSettingsCompositionRoute() {
    const params = projectSettingsCompositionRoute.useParams();
    return <ProjectSettingsCompositionSection {...params} />;
  },
});

export const projectSettingsAccessTokensRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'access-tokens',
  component: function ProjectSettingsAccessTokensRoute() {
    const params = projectSettingsAccessTokensRoute.useParams();
    return <ProjectAccessTokensSubPage {...params} />;
  },
});
