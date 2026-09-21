import { z } from 'zod';
import { TargetSettingsPage, TargetSettingsPageEnum } from '@/pages/target-settings';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

const TargetSettingRouteSearch = z.object({
  page: TargetSettingsPageEnum.default('general').optional(),
});

export const targetSettingsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'settings',
  validateSearch(search) {
    return TargetSettingRouteSearch.parse(search);
  },
  component: function TargetSettingsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetSettingsRoute.useParams();
    const { page } = targetSettingsRoute.useSearch();

    return (
      <TargetSettingsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        page={page}
      />
    );
  },
});
