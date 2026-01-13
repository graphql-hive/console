/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const guildConfig = require('@theguild/eslint-config/base');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { REACT_RESTRICTED_SYNTAX, RESTRICTED_SYNTAX } = require('@theguild/eslint-config/constants');
const path = require('path');

const SCHEMA_PATH = './packages/services/api/src/modules/*/module.graphql.ts';
const OPERATIONS_PATHS = [
  './packages/web/app/**/*.ts',
  './packages/web/app/**/*.tsx',
  './packages/web/app/**/*.graphql',
];

const rulesToExtends = Object.fromEntries(
  Object.entries(guildConfig.rules).filter(([key]) =>
    [
      'import/first',
      'no-restricted-globals',
      '@typescript-eslint/no-unused-vars',
      'unicorn/no-array-push-push',
      'no-else-return',
      'no-lonely-if',
      'unicorn/prefer-includes',
      'no-extra-boolean-cast',
    ].includes(key),
  ),
);

const HIVE_RESTRICTED_SYNTAX = [
  {
    // ❌ '0.0.0.0' or `0.0.0.0`
    selector: ':matches(Literal[value="0.0.0.0"], TemplateElement[value.raw="0.0.0.0"])',
    message: 'Use "::" to make it compatible with both IPv4 and IPv6',
  },
];

const tailwindCallees = ['clsx', 'cn', 'cva', 'cx'];

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  ignorePatterns: [
    'scripts',
    'rules',
    'out',
    '.hive',
    'public',
    'packages/web/app/src/graphql/index.ts',
    'packages/libraries/cli/src/sdk.ts',
    'packages/libraries/cli/src/gql/**/*',
    'packages/services/storage/src/db/types.ts',
    'packages/web/app/src/gql/**/*',
    'codegen.cjs',
    'tsup',
  ],
  overrides: [
    {
      // Setup GraphQL Parser
      files: '*.{graphql,gql}',
      parser: '@graphql-eslint/eslint-plugin',
      plugins: ['@graphql-eslint'],
      parserOptions: {
        schema: SCHEMA_PATH,
        operations: OPERATIONS_PATHS,
      },
    },
    {
      // Setup processor for operations/fragments definitions on code-files
      files: ['packages/web/app/**/*.tsx', 'packages/web/app/**/*.ts'],
      processor: '@graphql-eslint/graphql',
    },
    {
      files: ['packages/web/app/**/*.graphql'],
      plugins: ['@graphql-eslint'],
      rules: {
        '@graphql-eslint/require-id-when-available': 'error',
        '@graphql-eslint/no-deprecated': 'error',
      },
    },
    {
      files: ['*.cjs'],
      parserOptions: { ecmaVersion: 2020 },
    },
    {
      files: ['packages/**/*.ts', 'packages/**/*.tsx', 'cypress/**/*.ts', 'cypress/**/*.tsx'],
      reportUnusedDisableDirectives: true,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: [path.join(__dirname, './tsconfig.eslint.json')],
      },
      parser: '@typescript-eslint/parser',
      plugins: [...guildConfig.plugins, 'hive'],
      extends: guildConfig.extends,
      rules: {
        'no-process-env': 'error',
        'no-empty': ['error', { allowEmptyCatch: true }],
        'import/no-absolute-path': 'error',
        'import/no-self-import': 'error',
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: [
              'packages/services/storage/tools/*.js',
              'packages/services/**',
              'packages/migrations/**',
              // We bundle it all anyway, so there are no node_modules
              'packages/web/app/**',
              '**/*.spec.ts',
              '**/*.test.ts',
            ],
            optionalDependencies: false,
          },
        ],
        'hive/enforce-deps-in-dev': [
          'error',
          {
            scopes: ['@hive', '@graphql-hive'],
            ignored: ['packages/libraries/**', 'packages/web/**'],
          },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        'sonarjs/no-unused-collection': 'warn',
        'sonarjs/no-inverted-boolean-check': 'warn',
        ...rulesToExtends,
        'no-lonely-if': 'off',
        'object-shorthand': 'off',
        'no-restricted-syntax': ['error', ...HIVE_RESTRICTED_SYNTAX, ...RESTRICTED_SYNTAX],
        'prefer-destructuring': 'off',
        'prefer-const': 'off',
        'no-useless-escape': 'off',
        'no-inner-declarations': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/triple-slash-reference': 'off',
      },
    },
    {
      files: ['packages/web/**'],
      extends: [
        '@theguild',
        '@theguild/eslint-config/react',
        'plugin:better-tailwindcss/legacy-recommended',
        'plugin:@next/next/recommended',
      ],
      settings: {
        'import/resolver': {
          typescript: {
            project: ['packages/web/app/tsconfig.json'],
          },
        },
      },
      rules: {
        // conflicts with official prettier-plugin-tailwindcss and tailwind v3
        'better-tailwindcss/enforce-consistent-class-order': 'off',
        // set more strict to highlight in editor
        'better-tailwindcss/enforce-canonical-classes': 'warn',
        'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
        'better-tailwindcss/enforce-shorthand-classes': 'off',
        'react/display-name': 'off',
        'react/prop-types': 'off',
        'react/no-unknown-property': 'off',
        'jsx-a11y/anchor-is-valid': ['off', { components: ['Link', 'NextLink'] }],
        'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image', 'NextImage'] }],
        'no-restricted-syntax': ['error', ...HIVE_RESTRICTED_SYNTAX, ...REACT_RESTRICTED_SYNTAX],
        'prefer-destructuring': 'off',
        'no-console': 'off',
        'no-useless-escape': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'react/jsx-no-useless-fragment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'off',
        'unicorn/filename-case': 'off',
        'import/no-default-export': 'off',
        '@next/next/no-img-element': 'off',
        '@typescript-eslint/ban-types': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        '@next/next/no-html-link-for-pages': 'off',
        'unicorn/no-negated-condition': 'off',
        'no-implicit-coercion': 'off',

        'react/jsx-key': 'warn',
      },
    },
    {
      files: ['packages/web/app/**'],
      settings: {
        'better-tailwindcss': {
          // tailwindcss 4: the path to the entry file of the css based tailwind config (eg: `src/global.css`)
          entryPoint: 'packages/web/app/src/index.css',
          callees: tailwindCallees,
        },
      },
      rules: {
        // better-tailwindcss assumes you're using v4...we're being explicit here due to our dual tailwind setups
        'better-tailwindcss/no-deprecated-classes': 'error',
        // Tailwind v4 uses CSS variables without var() syntax
        'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
        'better-tailwindcss/no-unknown-classes': [
          'error',
          {
            ignore: [
              'drag-none',
              // Tailwind v4 semantic colors from @theme in index.css
              // Regex patterns to match all utility variants (bg-*, text-*, border-*, etc.)
              // Includes optional opacity modifier (/40, /60, etc.)
              '(bg|text|border|ring|outline|shadow|from|via|to|fill|stroke|caret|accent|divide|placeholder)-(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|sidebar|sidebar-background|sidebar-foreground|sidebar-primary|sidebar-primary-foreground|sidebar-accent|sidebar-accent-foreground|sidebar-border|sidebar-ring|chart-1|chart-2)(/.*)?',
              // Animation utilities (from index.css, replaces tailwindcss-animate)
              'animate-in',
              'animate-out',
              'fade-in-.*',
              'fade-out-.*',
              'zoom-in-.*',
              'zoom-out-.*',
              'slide-in-from-.*',
              'slide-out-to-.*',
              // Custom radius from @theme
              'rounded-xs',
              // ring-offset with semantic colors
              'ring-offset-.*',
              // Data attribute variants with custom animations (for Radix UI components)
              'data-\\[side=(top|right|bottom|left)\\]:animate-slide-(up|down|left|right)-fade',
              // GraphiQL classes
              'graphiql-.*',
              // hive classes
              'hive-.*',
              // Schema diff custom classes (defined in index.css)
              'schema-doc-row-.*',
              // No scrollbar utility (defined in index.css)
              'no-scrollbar',
              // Tailwind v4 CSS variable syntax with parentheses
              '.*-\\(--.*\\)',
            ],
          },
        ],
      },
    },
    {
      files: ['packages/web/app/**/*.stories.tsx', 'packages/web/docs/**'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
      },
    },
    {
      files: ['packages/web/docs/**'],
      settings: {
        next: {
          rootDir: 'packages/web/docs',
        },
        'better-tailwindcss': {
          // tailwindcss 3: the path to the tailwind config file (eg: `tailwind.config.js`)
          tailwindConfig: 'packages/web/docs/tailwind.config.ts',
          callees: tailwindCallees,
        },
      },
      rules: {
        'import/extensions': 'off',
        // better-tailwindcss assumes you're using v4...we're being explicit here due to our dual tailwind setups
        'better-tailwindcss/no-deprecated-classes': 'off',
        'better-tailwindcss/no-unknown-classes': [
          'error',
          {
            ignore: [
              'light',
              'hive-focus',
              'hive-focus-within',
              'nextra-focus',
              'nextra-scrollbar',
              'no-scrollbar', // from Nextra
              'hive-slider',
              'hive-prose',
              'subheader',
              'subheading-anchor',
              'duration-\\[.*\\]', // Allow arbitrary duration values like duration-[.8s]
              'ease-\\[var\\(--.*\\)\\]', // Allow CSS variables in arbitrary ease values
              'x:.*', // Allow Nextra 4 custom variant prefix
            ],
          },
        ],
        // Allow CSS variables in arbitrary values for Tailwind v3
        'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
      },
    },
    {
      files: 'cypress/**',
      extends: 'plugin:cypress/recommended',
      rules: {
        'cypress/no-unnecessary-waiting': 'off',
        'cypress/unsafe-to-chain-command': 'off',
      },
    },
    {
      files: [
        // environment should be parsed to avoid global dependencies and sacred .env files
        'packages/**/environment.ts',
        // - environment is inlined and must be "registered" in next.config.js
        // - `import.meta.env` is not supported in Next.js yet
        'packages/web/docs/**',
      ],
      rules: {
        'no-process-env': 'off',
      },
    },
  ],
};
