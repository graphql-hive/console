import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { type CodegenConfig } from '@graphql-codegen/cli';
import { addTypenameSelectionDocumentTransform } from '@graphql-codegen/client-preset';

const config: CodegenConfig = {
  schema: './packages/services/api/src/modules/*/module.graphql.ts',
  emitLegacyCommonJSImports: true,
  generates: {
    // API
    './packages/services/api/src': defineConfig(
      {
        typeDefsFilePath: false,
        mergeSchema: {
          path: '../../../../schema.graphql',
          config: {
            includeDirectives: true,
            append: '\n\n directive @oneOf on INPUT_OBJECT',
          },
        },
        fixObjectTypeResolvers: 'fast',
        resolverGeneration: 'minimal',
        resolverMainFileMode: 'modules',
        resolverTypesPath: './__generated__/types.ts',
        scalarsOverrides: {
          DateTime: {
            type: { input: 'Date', output: 'Date | string | number' },
          },
          Date: { type: 'string' },
          SafeInt: { type: 'number' },
          ID: { type: 'string' },
        },
        typesPluginsConfig: {
          immutableTypes: true,
          namingConvention: 'change-case-all#pascalCase', // TODO: This is triggering a warning about type name not working 100% of the time. eddeee888 to fix in Server Preset by using `meta` field.
          contextType: 'GraphQLModules.ModuleContext',
          enumValues: {
            ProjectType: '../shared/entities#ProjectType',
            NativeFederationCompatibilityStatusType:
              '../shared/entities#NativeFederationCompatibilityStatusType',
            TargetAccessScope: '../modules/auth/providers/scopes#TargetAccessScope',
            ProjectAccessScope: '../modules/auth/providers/scopes#ProjectAccessScope',
            OrganizationAccessScope: '../modules/auth/providers/scopes#OrganizationAccessScope',
            SupportTicketPriority: '../shared/entities#SupportTicketPriority',
            SupportTicketStatus: '../shared/entities#SupportTicketStatus',
          },
          resolversNonOptionalTypename: {
            interfaceImplementingType: true,
            unionMember: true,
            excludeTypes: [
              'TokenInfoPayload',
              'OrganizationByInviteCodePayload',
              'JoinOrganizationPayload',
              'Schema',
              'GraphQLNamedType',
            ],
          },
        },
      },
      {
        hooks: {
          afterOneFileWrite: ['prettier --write'],
        },
      },
    ),
    './packages/web/app/src/gql/': {
      documents: ['./packages/web/app/src/(components|lib|pages|server)/**/*.ts(x)?'],
      preset: 'client',
      config: {
        scalars: {
          DateTime: 'string',
          Date: 'string',
          SafeInt: 'number',
          JSONSchemaObject: 'json-schema-typed#JSONSchema',
        },
      },
      presetConfig: {
        persistedDocuments: true,
      },
      plugins: [],
      documentTransforms: [addTypenameSelectionDocumentTransform],
    },
    './packages/web/app/src/gql/schema.ts': {
      plugins: ['urql-introspection'],
      config: {
        useTypeImports: true,
        module: 'es2015',
      },
    },
    // CLI
    './packages/libraries/cli/src/gql/': {
      documents: ['./packages/libraries/cli/src/(commands|helpers)/**/*.ts'],
      preset: 'client',
      plugins: [],
      config: {
        useTypeImports: true,
      },
    },
    // Client
    'packages/libraries/core/src/client/__generated__/types.ts': {
      documents: ['./packages/libraries/core/src/client/**/*.ts'],
      config: {
        flattenGeneratedTypes: true,
        onlyOperationTypes: true,
      },
      plugins: ['typescript', 'typescript-operations'],
    },
    // Integration tests
    './integration-tests/testkit/gql/': {
      documents: ['./integration-tests/(testkit|tests)/**/*.ts'],
      preset: 'client',
      plugins: [],
      config: {
        scalars: {
          DateTime: 'string',
          Date: 'string',
          SafeInt: 'number',
        },
      },
    },
  },
};

module.exports = config;
