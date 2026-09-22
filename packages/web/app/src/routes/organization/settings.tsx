import { z } from 'zod';
import { AccessTokensSubPage } from '@/components/organization/settings/access-tokens/access-tokens-sub-page';
import { PersonalAccessTokensSubPage } from '@/components/organization/settings/personal-access-tokens/personal-access-tokens-sub-page';
import { SingleSignOnSubpage } from '@/components/organization/settings/single-sign-on/single-sign-on-subpage';
import {
  OrganizationSettingsGeneralSection,
  OrganizationSettingsPage,
  OrganizationSettingsPolicySection,
} from '@/pages/organization-settings';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { organizationRoute } from './route';

export const organizationSettingsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/settings',
  component: function OrganizationSettingsRoute() {
    const params = organizationSettingsRoute.useParams();
    return <OrganizationSettingsPage {...params} />;
  },
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const organizationSettingsIndexRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.organizationSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.organizationSettings, search),
  component: function OrganizationSettingsIndexRoute() {
    const params = organizationSettingsIndexRoute.useParams();
    return <OrganizationSettingsGeneralSection {...params} />;
  },
});

export const organizationSettingsSsoRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'sso',
  component: function OrganizationSettingsSsoRoute() {
    const params = organizationSettingsSsoRoute.useParams();
    return <SingleSignOnSubpage {...params} />;
  },
});

export const organizationSettingsPolicyRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'policy',
  component: function OrganizationSettingsPolicyRoute() {
    const params = organizationSettingsPolicyRoute.useParams();
    return <OrganizationSettingsPolicySection {...params} />;
  },
});

export const organizationSettingsAccessTokensRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'access-tokens',
  component: function OrganizationSettingsAccessTokensRoute() {
    const params = organizationSettingsAccessTokensRoute.useParams();
    return <AccessTokensSubPage {...params} />;
  },
});

export const organizationSettingsPersonalAccessTokensRoute = createRoute({
  getParentRoute: () => organizationSettingsRoute,
  path: 'personal-access-tokens',
  component: function OrganizationSettingsPersonalAccessTokensRoute() {
    const params = organizationSettingsPersonalAccessTokensRoute.useParams();
    return <PersonalAccessTokensSubPage {...params} />;
  },
});
