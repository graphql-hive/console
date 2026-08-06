import { createContext, useContext, type ReactNode } from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

/**
 * A stand-in router for previews.
 *
 * `Link` throws without router context, and the real router in `src/router.tsx` is unusable here:
 * it pulls in every page, and with them `@/env/frontend`, which validates an environment foundry
 * does not have.
 *
 * `RouterContextProvider` looks like the obvious fit but is not enough. It supplies the router
 * without ever resolving a location, so `state.matches` stays empty and `Link`'s `useMatch` fails
 * with "Could not find a nearest match!". Only `RouterProvider` initialises matches, and it renders
 * the matched route rather than its children.
 *
 * So the root route renders whatever is in `PreviewSlot`, and the provider puts the preview's
 * children there. `RouterProvider` gets its normal lifecycle; the canvas still shows the preview.
 */
const PreviewSlot = createContext<ReactNode>(null);

export const PreviewSlotProvider = PreviewSlot.Provider;

function SlotOutlet() {
  return <>{useContext(PreviewSlot)}</>;
}

const rootRoute = createRootRoute({ component: SlotOutlet });

/**
 * Enough shape for `buildLocation` to interpolate params into an href. Nothing navigates, so the
 * routes need no components. These three cover the great majority of links in the app; the splat
 * catches the rest.
 */
const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '$organizationSlug' }),
  createRoute({ getParentRoute: () => rootRoute, path: '$organizationSlug/$projectSlug' }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '$organizationSlug/$projectSlug/$targetSlug',
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '$' }),
]);

export const previewRouter = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ['/'] }),
});
