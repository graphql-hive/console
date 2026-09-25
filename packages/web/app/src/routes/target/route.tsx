import { z } from 'zod';
import { TargetLayout } from '@/components/layouts/target';
import { TargetPage } from '@/pages/target';
import { createRoute, Outlet } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';

export const targetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug/$targetSlug',
  component: function TargetRoute() {
    return (
      <TargetLayout>
        <Outlet />
      </TargetLayout>
    );
  },
});

export const targetIndexRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: '/',
  validateSearch: z.object({
    service: z.string().optional(),
  }),
  component: TargetPage,
});
