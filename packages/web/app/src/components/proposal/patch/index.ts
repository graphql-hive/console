import {
  ASTNode,
  buildASTSchema,
  DocumentNode,
  GraphQLSchema,
  isDefinitionNode,
  Kind,
  parse,
  printSchema,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  visit,
} from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  directiveAdded,
  directiveArgumentAdded,
  directiveArgumentDefaultValueChanged,
  directiveArgumentDescriptionChanged,
  directiveLocationAdded,
} from './patches/directives';
import {
  enumValueAdded,
  enumValueDeprecationReasonAdded,
  enumValueDescriptionChanged,
  enumValueRemoved,
} from './patches/enum';
import {
  fieldAdded,
  fieldArgumentAdded,
  fieldDeprecationAdded,
  fieldDeprecationReadonAdded,
  fieldDescriptionAdded,
  fieldDescriptionRemoved,
  fieldRemoved,
  fieldTypeChanged,
} from './patches/fields';
import { inputFieldAdded, inputFieldDescriptionAdded } from './patches/inputs';
import {
  schemaMutationTypeChanged,
  schemaQueryTypeChanged,
  schemaSubscriptionTypeChanged,
} from './patches/schema';
import {
  objectTypeInterfaceAdded,
  typeAdded,
  typeDescriptionAdded,
  typeRemoved,
} from './patches/types';
import { unionMemberAdded } from './patches/unions';
import { PatchConfig, SchemaNode } from './types';
import { debugPrintChange } from './utils';

export function patchSchema(schema: GraphQLSchema, changes: Change<any>[]): GraphQLSchema {
  const ast = parse(printSchema(schema));
  return buildASTSchema(patch(ast, changes), { assumeValid: true, assumeValidSDL: true });
}

function groupNodesByPath(ast: DocumentNode): [SchemaNode[], Map<string, ASTNode>] {
  const schemaNodes: SchemaNode[] = [];
  const nodeByPath = new Map<string, ASTNode>();
  const pathArray: string[] = [];
  visit(ast, {
    enter(node) {
      switch (node.kind) {
        case Kind.ARGUMENT:
        case Kind.ENUM_TYPE_DEFINITION:
        case Kind.DIRECTIVE_DEFINITION:
        case Kind.ENUM_TYPE_EXTENSION:
        case Kind.ENUM_VALUE_DEFINITION:
        case Kind.FIELD_DEFINITION:
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        case Kind.INPUT_VALUE_DEFINITION:
        case Kind.INTERFACE_TYPE_DEFINITION:
        case Kind.INTERFACE_TYPE_EXTENSION:
        case Kind.OBJECT_FIELD:
        case Kind.OBJECT_TYPE_DEFINITION:
        case Kind.OBJECT_TYPE_EXTENSION:
        case Kind.SCALAR_TYPE_DEFINITION:
        case Kind.SCALAR_TYPE_EXTENSION:
        case Kind.UNION_TYPE_DEFINITION:
        case Kind.UNION_TYPE_EXTENSION: {
          pathArray.push(node.name.value);
          const path = pathArray.join('.');
          nodeByPath.set(path, node);
          break;
        }
        case Kind.DOCUMENT: {
          break;
        }
        case Kind.SCHEMA_EXTENSION:
        case Kind.SCHEMA_DEFINITION: {
          schemaNodes.push(node);
          break;
        }
        default: {
          // by definition this things like return types, names, named nodes...
          // it's nothing we want to collect.
          return false;
        }
      }
    },
    leave(node) {
      switch (node.kind) {
        case Kind.ARGUMENT:
        case Kind.ENUM_TYPE_DEFINITION:
        case Kind.DIRECTIVE_DEFINITION:
        case Kind.ENUM_TYPE_EXTENSION:
        case Kind.ENUM_VALUE_DEFINITION:
        case Kind.FIELD_DEFINITION:
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        case Kind.INPUT_VALUE_DEFINITION:
        case Kind.INTERFACE_TYPE_DEFINITION:
        case Kind.INTERFACE_TYPE_EXTENSION:
        case Kind.OBJECT_FIELD:
        case Kind.OBJECT_TYPE_DEFINITION:
        case Kind.OBJECT_TYPE_EXTENSION:
        case Kind.SCALAR_TYPE_DEFINITION:
        case Kind.SCALAR_TYPE_EXTENSION:
        case Kind.UNION_TYPE_DEFINITION:
        case Kind.UNION_TYPE_EXTENSION: {
          pathArray.pop();
        }
      }
    },
  });
  return [schemaNodes, nodeByPath];
}

export function patch(
  ast: DocumentNode,
  changes: Change<any>[],
  patchConfig?: PatchConfig,
): DocumentNode {
  const config: PatchConfig = patchConfig ?? {};

  const [schemaDefs, nodeByPath] = groupNodesByPath(ast);

  for (const change of changes) {
    if (config.debug) {
      debugPrintChange(change, nodeByPath);
    }

    const changedPath = change.path;
    if (changedPath === undefined) {
      // a change without a path is useless... (@todo Only schema changes do this?)
      continue;
    }

    switch (change.type) {
      case ChangeType.SchemaMutationTypeChanged: {
        schemaMutationTypeChanged(change, schemaDefs, config);
        break;
      }
      case ChangeType.SchemaQueryTypeChanged: {
        schemaQueryTypeChanged(change, schemaDefs, config);
        break;
      }
      case ChangeType.SchemaSubscriptionTypeChanged: {
        schemaSubscriptionTypeChanged(change, schemaDefs, config);
        break;
      }
      case ChangeType.DirectiveAdded: {
        directiveAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.DirectiveArgumentAdded: {
        directiveArgumentAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.DirectiveLocationAdded: {
        directiveLocationAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.EnumValueAdded: {
        enumValueAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.EnumValueDeprecationReasonAdded: {
        enumValueDeprecationReasonAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldAdded: {
        fieldAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldArgumentAdded: {
        fieldArgumentAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldDeprecationAdded: {
        fieldDeprecationAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldDeprecationReasonAdded: {
        fieldDeprecationReadonAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldDescriptionAdded: {
        fieldDescriptionAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.InputFieldAdded: {
        inputFieldAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.InputFieldDescriptionAdded: {
        inputFieldDescriptionAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.ObjectTypeInterfaceAdded: {
        objectTypeInterfaceAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.TypeDescriptionAdded: {
        typeDescriptionAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.TypeAdded: {
        typeAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.UnionMemberAdded: {
        unionMemberAdded(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldRemoved: {
        fieldRemoved(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldTypeChanged: {
        fieldTypeChanged(change, nodeByPath, config);
        break;
      }
      case ChangeType.TypeRemoved: {
        typeRemoved(change, nodeByPath, config);
        break;
      }
      case ChangeType.EnumValueRemoved: {
        enumValueRemoved(change, nodeByPath, config);
        break;
      }
      case ChangeType.EnumValueDescriptionChanged: {
        enumValueDescriptionChanged(change, nodeByPath, config);
        break;
      }
      case ChangeType.FieldDescriptionRemoved: {
        fieldDescriptionRemoved(change, nodeByPath, config);
        break;
      }
      case ChangeType.DirectiveArgumentDefaultValueChanged: {
        directiveArgumentDefaultValueChanged(change, nodeByPath, config);
        break;
      }
      case ChangeType.DirectiveArgumentDescriptionChanged: {
        directiveArgumentDescriptionChanged(change, nodeByPath, config);
        break;
      }
      case ChangeType.DirectiveArgumentTypeChanged: {
        directiveArgumentTypeChanged(change, nodeByPath, config);
      }
      // DirectiveUsageArgumentDefinitionAddedChange,
      // DirectiveUsageArgumentDefinitionRemovedChange,
      // DirectiveUsageArgumentDefinitionChange,
      // DirectiveUsageEnumAddedChange,
      // DirectiveUsageEnumRemovedChange,
      // DirectiveUsageEnumValueAddedChange,
      // DirectiveUsageEnumValueRemovedChange,
      // DirectiveUsageFieldAddedChange,
      // DirectiveUsageFieldDefinitionAddedChange,
      // DirectiveUsageFieldDefinitionRemovedChange,
      // DirectiveUsageFieldRemovedChange,
      // DirectiveUsageInputFieldDefinitionAddedChange,
      // DirectiveUsageInputFieldDefinitionRemovedChange,
      // DirectiveUsageInputObjectAddedChange,
      // DirectiveUsageInputObjectRemovedChange,
      // DirectiveUsageInterfaceAddedChange,
      // DirectiveUsageInterfaceRemovedChange,
      // DirectiveUsageObjectAddedChange,
      // DirectiveUsageObjectRemovedChange,
      // DirectiveUsageScalarAddedChange,
      // DirectiveUsageScalarRemovedChange,
      // DirectiveUsageSchemaAddedChange,
      // DirectiveUsageSchemaRemovedChange,
      // DirectiveUsageUnionMemberAddedChange,
      // DirectiveUsageUnionMemberRemovedChange,
      default: {
        console.log(`${change.type} is not implemented yet.`);
      }
    }
  }

  return {
    kind: Kind.DOCUMENT,

    // filter out the non-definition nodes (e.g. field definitions)
    definitions: nodeByPath.values().filter(isDefinitionNode).toArray(),
  };
}
