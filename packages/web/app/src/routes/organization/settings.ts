import { z } from 'zod';
import {
  AccessTokensSubPage,
  AccessTokensSubPage_OrganizationQuery,
} from '@/components/organization/settings/access-tokens/access-tokens-sub-page';
import {
  PersonalAccessTokensSubPage,
  PersonalAccessTokensSubPage_OrganizationQuery,
} from '@/components/organization/settings/personal-access-tokens/personal-access-tokens-sub-page';
import {
  SingleSignOnSubpage,
  SingleSignOnSubpageQuery,
} from '@/components/organization/settings/single-sign-on/single-sign-on-subpage';
import { loadQuery, revalidate, type LoaderContext } from '@/lib/route-utils';
import {
  OrganizationSettingsGeneralSection,
  OrganizationSettingsPage,
  OrganizationSettingsPageQuery,
  OrganizationSettingsPolicySection,
  organizationSettingsSections,
  type OrganizationSettingsSectionId,
} from '@/pages/organization-settings';
import { createRoute, redirect } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { organizationRoute } from './route';

type SettingsLoader = LoaderContext & { params: { organizationSlug: string } };

// Awaited: which sections the viewer may open decides where a section URL lands.
async function loadSettings(loader: SettingsLoader) {
  const { organizationSlug } = loader.params;
  const result = await loadQuery(loader, OrganizationSettingsPageQuery, { organizationSlug });
  return { slugs: { organizationSlug }, organization: result.data?.organization };
}

// A section the viewer may not open falls back to the first one they may, else the organization.
async function loadSection(loader: SettingsLoader, id: OrganizationSettingsSectionId) {
  const { slugs, organization } = await loadSettings(loader);
  if (!organization) {
    return;
  }
  const visible = organizationSettingsSections(organization);
  if (visible.some(section => section.id === id)) {
    return;
  }
  const fallback = visible.at(0);
  if (fallback) {
    throw redirect({ to: fallback.to, params: slugs });
  }
  throw redirect({ to: '/$organizationSlug', params: slugs });
}

export const organizationSettingsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/settings',
  loader: async loader => {
    await loadSettings(loader);
  },
  component: OrganizationSettingsPage,
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const organizationSettingsIndexRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.organizationSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.organizationSettings, search),
  loader: loader => loadSection(loader, 'general'),
  component: OrganizationSettingsGeneralSection,
});

// Tokens and the SSO setup change outside this tab, so their sections revalidate on every visit.
export const organizationSettingsSsoRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'sso',
  preloadStaleTime: 0,
  loader: loader => {
    void loadQuery(loader, SingleSignOnSubpageQuery, loader.params, revalidate(loader));
    return loadSection(loader, 'sso');
  },
  component: SingleSignOnSubpage,
});

export const organizationSettingsPolicyRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'policy',
  loader: loader => loadSection(loader, 'policy'),
  component: OrganizationSettingsPolicySection,
});

export const organizationSettingsAccessTokensRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'access-tokens',
  preloadStaleTime: 0,
  loader: loader => {
    void loadQuery(
      loader,
      AccessTokensSubPage_OrganizationQuery,
      loader.params,
      revalidate(loader),
    );
    return loadSection(loader, 'access-tokens');
  },
  component: AccessTokensSubPage,
});

export const organizationSettingsPersonalAccessTokensRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'personal-access-tokens',
  preloadStaleTime: 0,
  loader: loader => {
    void loadQuery(
      loader,
      PersonalAccessTokensSubPage_OrganizationQuery,
      loader.params,
      revalidate(loader),
    );
    return loadSection(loader, 'personal-access-tokens');
  },
  component: PersonalAccessTokensSubPage,
});
