import {
  ArgumentNode,
  ASTNode,
  DirectiveNode,
  FieldDefinitionNode,
  GraphQLDeprecatedDirective,
  InputValueDefinitionNode,
  Kind,
  parseType,
  parseValue,
  print,
  StringValueNode,
  TypeNode,
} from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  CoordinateAlreadyExistsError,
  CoordinateNotFoundError,
  DeprecationReasonAlreadyExists,
  DirectiveAlreadyExists,
  FieldTypeMismatchError,
  handleError,
  KindMismatchError,
} from '../errors';
import { nameNode, stringNode } from '../node-templates';
import type { PatchConfig } from '../types';
import { getDeprecatedDirectiveNode, parentPath } from '../utils';

export function fieldTypeChanged(
  change: Change<ChangeType.FieldTypeChanged>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const c = change as Change<ChangeType.FieldTypeChanged>;
  const node = nodeByPath.get(c.path!);
  if (node) {
    if (node.kind === Kind.FIELD_DEFINITION) {
      const currentReturnType = print(node.type);
      if (c.meta.oldFieldType === currentReturnType) {
        (node.type as TypeNode) = parseType(c.meta.newFieldType);
      } else {
        handleError(c, new FieldTypeMismatchError(c.meta.oldFieldType, currentReturnType), config);
      }
    } else {
      handleError(c, new KindMismatchError(Kind.FIELD_DEFINITION, node.kind), config);
    }
  } else {
    handleError(c, new CoordinateNotFoundError(), config);
  }
}

export function fieldRemoved(
  removal: Change<ChangeType.FieldRemoved>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = removal.path!;
  const typeNode = nodeByPath.get(parentPath(changedPath)) as
    | (ASTNode & { fields?: FieldDefinitionNode[] })
    | undefined;
  if (!typeNode || !typeNode.fields?.length) {
    handleError(removal, new CoordinateNotFoundError(), config);
  } else {
    const beforeLength = typeNode.fields.length;
    typeNode.fields = typeNode.fields.filter(f => f.name.value !== removal.meta.removedFieldName);
    if (beforeLength === typeNode.fields.length) {
      handleError(removal, new CoordinateNotFoundError(), config);
    } else {
      // delete the reference to the removed field.
      nodeByPath.delete(changedPath);
    }
  }
}

export function fieldAdded(
  change: Change<ChangeType.FieldAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const changedNode = nodeByPath.get(changedPath);
  if (changedNode) {
    handleError(change, new CoordinateAlreadyExistsError(changedNode.kind), config);
  } else {
    const typeNode = nodeByPath.get(parentPath(changedPath)) as ASTNode & {
      fields?: FieldDefinitionNode[];
    };
    if (!typeNode) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (
      typeNode.kind !== Kind.OBJECT_TYPE_DEFINITION &&
      typeNode.kind !== Kind.INTERFACE_TYPE_DEFINITION
    ) {
      handleError(change, new KindMismatchError(Kind.ENUM_TYPE_DEFINITION, typeNode.kind), config);
    } else {
      const node: FieldDefinitionNode = {
        kind: Kind.FIELD_DEFINITION,
        name: nameNode(change.meta.addedFieldName),
        type: parseType(change.meta.addedFieldReturnType),
        description: change.meta.addedFieldDescription
          ? stringNode(change.meta.addedFieldDescription)
          : undefined,
      };

      typeNode.fields = [...(typeNode.fields ?? []), node];

      // add new field to the node set
      nodeByPath.set(changedPath, node);
    }
  }
}

export function fieldArgumentAdded(
  change: Change<ChangeType.FieldArgumentAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const existing = nodeByPath.get(changedPath);
  if (existing) {
    handleError(change, new CoordinateAlreadyExistsError(existing.kind), config);
  } else {
    const fieldNode = nodeByPath.get(parentPath(changedPath)) as ASTNode & {
      arguments?: InputValueDefinitionNode[];
    };
    if (!fieldNode) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (!fieldNode.arguments) {
      handleError(change, new KindMismatchError(Kind.FIELD_DEFINITION, fieldNode.kind), config);
    } else {
      const node: InputValueDefinitionNode = {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: nameNode(change.meta.addedArgumentName),
        type: parseType(change.meta.addedArgumentType),
        description: change.meta.addedFieldArgumentDescription
          ? stringNode(change.meta.addedFieldArgumentDescription)
          : undefined,
      };

      fieldNode.arguments = [...(fieldNode.arguments ?? []), node];

      // add new field to the node set
      nodeByPath.set(changedPath, node);
    }
  }
}

export function fieldDeprecationReadonAdded(
  change: Change<ChangeType.FieldDeprecationReasonAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const deprecationNode = nodeByPath.get(changedPath);
  if (deprecationNode) {
    if (deprecationNode.kind === Kind.DIRECTIVE) {
      const reasonArgument = deprecationNode.arguments?.find(a => a.name.value === 'reason');
      if (reasonArgument) {
        handleError(
          change,
          new DeprecationReasonAlreadyExists((reasonArgument.value as StringValueNode)?.value),
          config,
        );
      } else {
        (deprecationNode.arguments as ArgumentNode[] | undefined) = [
          ...(deprecationNode.arguments ?? []),
          {
            kind: Kind.ARGUMENT,
            name: nameNode('reason'),
            value: stringNode(change.meta.addedDeprecationReason),
          } as ArgumentNode,
        ];
        // nodeByPath.set(changedPath)
      }
    } else {
      handleError(change, new KindMismatchError(Kind.DIRECTIVE, deprecationNode.kind), config);
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function fieldDeprecationAdded(
  change: Change<ChangeType.FieldDeprecationAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const fieldNode = nodeByPath.get(changedPath);
  if (fieldNode) {
    if (fieldNode.kind === Kind.FIELD_DEFINITION) {
      const hasExistingDeprecationDirective = getDeprecatedDirectiveNode(fieldNode);
      if (hasExistingDeprecationDirective) {
        handleError(change, new DirectiveAlreadyExists(GraphQLDeprecatedDirective.name), config);
      } else {
        const directiveNode = {
          kind: Kind.DIRECTIVE,
          name: nameNode(GraphQLDeprecatedDirective.name),
          ...(change.meta.deprecationReason
            ? {
                arguments: [
                  {
                    kind: Kind.ARGUMENT,
                    name: nameNode('reason'),
                    value: stringNode(change.meta.deprecationReason),
                  },
                ],
              }
            : {}),
        } as DirectiveNode;

        (fieldNode.directives as DirectiveNode[] | undefined) = [
          ...(fieldNode.directives ?? []),
          directiveNode,
        ];
        nodeByPath.set(`${changedPath}.${directiveNode.name.value}`, directiveNode);
      }
    } else {
      handleError(change, new KindMismatchError(Kind.FIELD_DEFINITION, fieldNode.kind), config);
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function fieldDescriptionAdded(
  change: Change<ChangeType.FieldDescriptionAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const fieldNode = nodeByPath.get(changedPath);
  if (fieldNode) {
    if (fieldNode.kind === Kind.FIELD_DEFINITION) {
      (fieldNode.description as StringValueNode | undefined) = change.meta.addedDescription
        ? stringNode(change.meta.addedDescription)
        : undefined;
    } else {
      handleError(change, new KindMismatchError(Kind.FIELD_DEFINITION, fieldNode.kind), config);
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function fieldDescriptionRemoved(
  change: Change<ChangeType.FieldDescriptionRemoved>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const fieldNode = nodeByPath.get(changedPath);
  if (fieldNode) {
    if (fieldNode.kind === Kind.FIELD_DEFINITION) {
      (fieldNode.description as StringValueNode | undefined) = undefined;
    } else {
      handleError(change, new KindMismatchError(Kind.FIELD_DEFINITION, fieldNode.kind), config);
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}
