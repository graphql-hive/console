import { defineConfig } from 'react-foundry';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  previews: 'src/components/base/**/*.preview.tsx',
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
            { label: 'Input' },
            { label: 'CopyChip' },
          ],
        },
        {
          label: 'FormControls',
          children: [
            { label: 'Checkbox' },
            { label: 'RadioGroup' },
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
    plugins: [tsconfigPaths({ root: process.cwd() }), tailwindcss()],
  },
});
