const { plugins, ...prettierConfig } = require('@theguild/prettier-config');
/**
 * @type {import('prettier').Config}
 */

module.exports = {
  ...prettierConfig,
  importOrderParserPlugins: [
    'importAssertions',
    // `using` keyword
    'explicitResourceManagement',
    ...prettierConfig.importOrderParserPlugins,
  ],
  plugins: [
    'prettier-plugin-sql',
    ...plugins,
    // For sort CSS classes.
    // Make sure to keep this one last, see: https://github.com/tailwindlabs/prettier-plugin-tailwindcss#compatibility-with-other-prettier-plugins
    'prettier-plugin-tailwindcss',
  ],
  // prettier-plugin-sql options
  language: 'postgresql',
  keywordCase: 'upper',
  // prettier-plugin-tailwindcss sorts against the theme in each package's Tailwind entry stylesheet.
  overrides: [
    ...prettierConfig.overrides,
    {
      files: 'packages/web/app/**',
      options: { tailwindStylesheet: './packages/web/app/src/index.css' },
    },
    {
      files: 'packages/libraries/laboratory/**',
      options: { tailwindStylesheet: './packages/libraries/laboratory/src/index.css' },
    },
  ],
};
