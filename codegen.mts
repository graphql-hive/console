import {
  buildASTSchema,
  isInterfaceType,
  isObjectType,
  Kind,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  type FragmentDefinitionNode,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { type CodegenConfig } from '@graphql-codegen/cli';
import { addTypenameSelectionDocumentTransform } from '@graphql-codegen/client-preset';

// urql's normalized cache keys entities by `id`; one selected without it cannot be updated in place.
const addIdSelectionDocumentTransform: typeof addTypenameSelectionDocumentTransform = {
  transform({ documents, schema: schemaAst }) {
    const schema = buildASTSchema(schemaAst, { assumeValid: true });
    const typeInfo = new TypeInfo(schema);
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const { document } of documents) {
      for (const definition of document?.definitions ?? []) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          fragments.set(definition.name.value, definition);
        }
      }
    }

    function isIdField(selection: SelectionNode): boolean {
      return selection.kind === Kind.FIELD && selection.name.value === 'id' && !selection.alias;
    }

    function selectsId(
      type: GraphQLObjectType | GraphQLInterfaceType,
      selectionSet: SelectionSetNode,
    ): boolean {
      return selectionSet.selections.some(selection => {
        if (selection.kind === Kind.FIELD) {
          return isIdField(selection);
        }
        if (selection.kind === Kind.INLINE_FRAGMENT) {
          return !selection.typeCondition && selectsId(type, selection.selectionSet);
        }
        const fragment = fragments.get(selection.name.value);
        const fragmentType = fragment && schema.getType(fragment.typeCondition.name.value);
        return (
          !!fragment &&
          (fragmentType === type ||
            (isInterfaceType(fragmentType) && schema.isSubType(fragmentType, type))) &&
          selectsId(type, fragment.selectionSet)
        );
      });
    }

    return documents.map(document => ({
      ...document,
      document:
        document.document &&
        visit(
          document.document,
          visitWithTypeInfo(typeInfo, {
            SelectionSet(node, _key, parent, _path, ancestors) {
              const type = typeInfo.getParentType();
              if (
                !(isObjectType(type) || isInterfaceType(type)) ||
                !type.getFields().id ||
                selectsId(type, node)
              ) {
                return undefined;
              }
              // An inline fragment is covered by an `id` selected next to it.
              for (
                let depth = ancestors.length;
                parent && 'kind' in parent && parent.kind === Kind.INLINE_FRAGMENT;
                depth -= 3
              ) {
                const enclosing = ancestors[depth - 2];
                if (
                  'kind' in enclosing &&
                  enclosing.kind === Kind.SELECTION_SET &&
                  enclosing.selections.some(isIdField)
                ) {
                  return undefined;
                }
                parent = ancestors[depth - 3];
              }
              return {
                ...node,
                selections: [
                  { kind: Kind.FIELD, name: { kind: Kind.NAME, value: 'id' } },
                  ...node.selections,
                ],
              };
            },
          }),
        ),
    }));
  },
};

const config: CodegenConfig = {
  schema: './packages/services/api/src/modules/*/module.graphql.ts',
  emitLegacyCommonJSImports: true,
  generates: {
    // API
    './packages/services/api/src': defineConfig(
      {
        typeDefsFilePath: false,
        mergeSchema: false,
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
    // schema-ast omits the @oneOf definition (graphql-js treats it as built-in), but the
    // published schema needs it declared (#6679), so append it.
    './schema.graphql': {
      plugins: [
        'schema-ast',
        { add: { placement: 'append', content: 'directive @oneOf on INPUT_OBJECT' } },
      ],
      config: { includeDirectives: true },
    },
    './packages/web/app/src/gql/': {
      documents: ['./packages/web/app/src/(components|lib|pages|server)/**/*.ts(x)?'],
      preset: 'client',
      config: {
        enumType: 'native',
        scalars: {
          ID: 'string',
          DateTime64: 'string',
          JSONObject: 'Record<string,unknown>',
          DateTime: 'string',
          Date: 'string',
          SafeInt: 'number',
          JSONSchemaObject: 'json-schema-typed#JSONSchema',
        },
      },
      presetConfig: {
        persistedDocuments: true,
      },
      documentTransforms: [addTypenameSelectionDocumentTransform, addIdSelectionDocumentTransform],
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
      config: {
        enumType: 'native',
        useTypeImports: true,
      },
    },
    // Client
    'packages/libraries/core/src/client/__generated__/types.ts': {
      documents: ['./packages/libraries/core/src/client/**/*.ts'],
      config: {
        flattenGeneratedTypes: true,
      },
      plugins: ['typescript-operations'],
    },
    // Integration tests
    './integration-tests/testkit/gql/': {
      documents: ['./integration-tests/(testkit|tests)/**/*.ts'],
      preset: 'client',
      config: {
        enumType: 'native',
        scalars: {
          DateTime: 'string',
          Date: 'string',
          SafeInt: 'number',
        },
      },
    },
  },
};

export default config;
