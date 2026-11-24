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
import { addTypenameSelectionDocumentTransform } from '@graphql-codegen/client-preset';

// urql's normalized cache keys entities by `id`; one selected without it cannot be updated in place.
export const addIdSelectionDocumentTransform: typeof addTypenameSelectionDocumentTransform = {
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
