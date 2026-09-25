import { defineConfig } from 'react-foundry';
import type { Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

/**
 * `@/env/frontend` validates `window.__ENV` at import time and throws when it is missing, so
 * any preview whose component reaches it (PageLead through DocsLink, for one) fails before it
 * renders. The app sets `__ENV` from a `<script src="/__env.js">` in its index.html; this puts
 * an equivalent inline script at the top of foundry's, with the schema's required keys and the
 * same values as `.env.template`. Nothing in a preview calls these endpoints.
 */
const previewEnv: Plugin = {
  name: 'hive-preview-env',
  transformIndexHtml: () => [
    {
      tag: 'script',
      injectTo: 'head-prepend',
      children: `window.__ENV = ${JSON.stringify({
        ENVIRONMENT: 'development',
        APP_BASE_URL: 'http://localhost:3000',
        GRAPHQL_PUBLIC_ENDPOINT: 'http://localhost:3001/graphql',
        GRAPHQL_PUBLIC_SUBSCRIPTION_ENDPOINT: 'http://localhost:3001/graphql',
        GRAPHQL_PUBLIC_ORIGIN: 'http://localhost:3001',
      })};`,
    },
  ],
};

export default defineConfig({
  // Widened past `base/` so real app components can be previewed too, not just design-system
  // primitives. Previews of app components render inside the stand-in router in
  // `foundry.router.tsx` and stand in for query data with `makeFragmentData`.
  previews: 'src/components/**/*.preview.tsx',
  title: 'Hive Console Components',
  // Declaration order is display order, so this groups the shelf by kind rather than
  // alphabetically. It also narrows `NavPath` to these exact paths, which turns a typo in
  // a preview's `nav` export into a type error instead of a stray top-level group.
  nav: [
    {
      label: 'Base',
      children: [
        {
          label: 'Foundations',
          children: [{ label: 'TypeScale' }, { label: 'Focus' }, { label: 'SemanticColors' }],
        },
        {
          label: 'Primitives',
          children: [
            { label: 'Accordion' },
            { label: 'Avatar' },
            { label: 'Badge' },
            { label: 'StatusDot' },
            { label: 'Legend' },
            { label: 'Spinner' },
            { label: 'Button' },
            { label: 'Card' },
            { label: 'StatCard' },
            { label: 'Input' },
            { label: 'Textarea' },
            { label: 'CopyChip' },
            { label: 'Collapsible' },
            { label: 'ScrollArea' },
            { label: 'Tabs' },
            { label: 'Separator' },
          ],
        },
        {
          label: 'FormControls',
          children: [
            { label: 'Checkbox' },
            { label: 'RadioGroup' },
            { label: 'Switch' },
            { label: 'Slider' },
            { label: 'ToggleGroup' },
            { label: 'Form', children: [{ label: 'Component Examples' }] },
            { label: 'Label' },
          ],
        },
        {
          label: 'Floating',
          children: [
            { label: 'Menu' },
            { label: 'Popover' },
            { label: 'Select' },
            { label: 'FilterDropdown' },
            { label: 'FilterMenu' },
            { label: 'Search' },
            { label: 'Tooltip' },
            { label: 'PortalContainer' },
          ],
        },
        {
          label: 'Overlays',
          children: [{ label: 'Dialog' }, { label: 'Sheet' }, { label: 'AlertDialog' }],
        },
        {
          label: 'Feedback',
          children: [{ label: 'Toast' }],
        },
        {
          label: 'Navigation',
          children: [{ label: 'Navigation', children: [{ label: 'Component Examples' }] }],
        },
        // Data and layout
        { label: 'DataTable' },
        { label: 'DescriptionList' },
      ],
    },
    // The `ui/` and `v2/` primitives queued for migration to `base/`, rendered as they ship
    // today. Each entry transcribes every real call site, so a replacement can be judged
    // against the current thing rather than against invented examples, and so there is a
    // coverage checklist to migrate through. Entries are deleted as their component lands.
    {
      label: 'Inventory',
      children: [{ label: 'Presentational' }, { label: 'V2Leftovers' }],
    },
    // App components, as opposed to the design-system primitives above. Each preview
    // reproduces a real call site so a base-component change can be judged against the
    // compositions that actually ship.
    {
      label: 'Components',
      children: [
        { label: 'BillingPlanPicker' },
        { label: 'PageLead' },
        { label: 'NotFound' },
        { label: 'FailureCard' },
        { label: 'SupportForms' },
        { label: 'TabbedView' },
      ],
    },
  ],
  theme: {
    colors: {
      light: { canvas: 'var(--color-neutral-3)' },
      dark: { canvas: 'var(--color-neutral-2)' },
    },
  },
  viteConfig: {
    // Foundry's vite root is inside node_modules and this config is bundled to a cache
    // dir before it runs, so neither location can anchor tsconfig discovery. cwd is the
    // app directory, which is where `foundry dev` is invoked from.
    plugins: [tsconfigPaths({ root: process.cwd() }), tailwindcss(), previewEnv],
  },
});
