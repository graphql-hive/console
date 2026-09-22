import { z } from 'zod';
import { CDNAccessTokens } from '@/components/target/settings/cdn-access-tokens';
import { SchemaContracts } from '@/components/target/settings/schema-contracts';
import {
  TargetSettingsBaseSchemaSection,
  TargetSettingsBreakingChangesSection,
  TargetSettingsGeneralSection,
  TargetSettingsPage,
  TargetSettingsRegistryTokensSection,
} from '@/pages/target-settings';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { targetRoute } from './route';

export const targetSettingsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'settings',
  component: function TargetSettingsRoute() {
    const params = targetSettingsRoute.useParams();
    return <TargetSettingsPage {...params} />;
  },
});

// The bare URL is General. `page` exists only to catch the old `?page=` form.
export const targetSettingsIndexRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({ page: legacySearch.targetSettings.values.optional().catch(undefined) }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.targetSettings, search.page),
  component: function TargetSettingsIndexRoute() {
    const params = targetSettingsIndexRoute.useParams();
    return <TargetSettingsGeneralSection {...params} />;
  },
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
  component: function TargetSettingsCdnRoute() {
    const params = targetSettingsCdnRoute.useParams();
    return <CDNAccessTokens {...params} />;
  },
});

export const targetSettingsRegistryTokenRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'registry-token',
  component: function TargetSettingsRegistryTokenRoute() {
    const params = targetSettingsRegistryTokenRoute.useParams();
    return <TargetSettingsRegistryTokensSection {...params} />;
  },
});

export const targetSettingsBreakingChangesRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'breaking-changes',
  component: function TargetSettingsBreakingChangesRoute() {
    const params = targetSettingsBreakingChangesRoute.useParams();
    return <TargetSettingsBreakingChangesSection {...params} />;
  },
});

export const targetSettingsBaseSchemaRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'base-schema',
  component: function TargetSettingsBaseSchemaRoute() {
    const params = targetSettingsBaseSchemaRoute.useParams();
    return <TargetSettingsBaseSchemaSection {...params} />;
  },
});

export const targetSettingsSchemaContractsRoute = createRoute({
  getParentRoute: () => targetSettingsRoute,
  path: 'schema-contracts',
  component: function TargetSettingsSchemaContractsRoute() {
    const params = targetSettingsSchemaContractsRoute.useParams();
    return <SchemaContracts {...params} />;
  },
});
