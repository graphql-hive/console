import { defineConfig } from 'react-foundry';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

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
          label: 'Primitives',
          children: [
            { label: 'Accordion' },
            { label: 'Badge' },
            { label: 'Button' },
            { label: 'Card' },
            { label: 'StatCard' },
            { label: 'Input' },
            { label: 'CopyChip' },
          ],
        },
        {
          label: 'FormControls',
          children: [
            { label: 'Checkbox' },
            // The component's own previews sit on `RadioGroup`; the call-site
            // transcriptions hang underneath it rather than in a separate top-level group,
            // so a change can be judged against both without leaving the subtree.
            { label: 'RadioGroup', children: [{ label: 'Component Examples' }] },
            { label: 'Switch' },
            { label: 'Form' },
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
          ],
        },
        // Data and layout
        { label: 'DataTable' },
        { label: 'DescriptionList' },
        { label: 'PageLead' },
        { label: 'NotFound' },
      ],
    },
    // The `ui/` and `v2/` primitives queued for migration to `base/`, rendered as they ship
    // today. Each entry transcribes every real call site, so a replacement can be judged
    // against the current thing rather than against invented examples, and so there is a
    // coverage checklist to migrate through. Entries are deleted as their component lands.
    {
      label: 'Inventory',
      children: [{ label: 'Popover' }, { label: 'Select' }],
    },
    // App components, as opposed to the design-system primitives above. Each preview
    // reproduces a real call site so a base-component change can be judged against the
    // compositions that actually ship.
    {
      label: 'Components',
      children: [{ label: 'BillingPlanPicker' }],
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
    plugins: [tsconfigPaths({ root: process.cwd() }), tailwindcss()],
  },
});
