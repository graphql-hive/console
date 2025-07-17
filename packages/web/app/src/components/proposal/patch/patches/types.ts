import {
  ASTNode,
  isTypeDefinitionNode,
  Kind,
  NamedTypeNode,
  StringValueNode,
  TypeDefinitionNode,
} from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  CoordinateAlreadyExistsError,
  CoordinateNotFoundError,
  handleError,
  InterfaceAlreadyExistsOnTypeError,
  KindMismatchError,
} from '../errors';
import { namedTypeNode, nameNode, stringNode } from '../node-templates';
import type { PatchConfig } from '../types';

export function typeAdded(
  change: Change<ChangeType.TypeAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const existing = nodeByPath.get(changedPath);
  if (existing) {
    handleError(change, new CoordinateAlreadyExistsError(existing.kind), config);
  } else {
    const node: TypeDefinitionNode = {
      name: nameNode(change.meta.addedTypeName),
      kind: change.meta.addedTypeKind as TypeDefinitionNode['kind'],
    };
    // @todo is this enough?
    nodeByPath.set(changedPath, node);
  }
}

export function typeRemoved(
  removal: Change<ChangeType.TypeRemoved>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = removal.path!;
  const removedNode = nodeByPath.get(changedPath);
  if (removedNode) {
    if (isTypeDefinitionNode(removedNode)) {
      // delete the reference to the removed field.
      for (const key of nodeByPath.keys()) {
        if (key.startsWith(changedPath)) {
          nodeByPath.delete(key);
        }
      }
    } else {
      handleError(
        removal,
        new KindMismatchError(Kind.OBJECT_TYPE_DEFINITION, removedNode.kind),
        config,
      );
    }
  } else {
    handleError(removal, new CoordinateNotFoundError(), config);
  }
}

export function typeDescriptionAdded(
  change: Change<ChangeType.TypeDescriptionAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const typeNode = nodeByPath.get(changedPath);
  if (typeNode) {
    if (isTypeDefinitionNode(typeNode)) {
      (typeNode.description as StringValueNode | undefined) = change.meta.addedTypeDescription
        ? stringNode(change.meta.addedTypeDescription)
        : undefined;
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.OBJECT_TYPE_DEFINITION, typeNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function objectTypeInterfaceAdded(
  change: Change<ChangeType.ObjectTypeInterfaceAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const typeNode = nodeByPath.get(changedPath);
  if (typeNode) {
    if (
      typeNode.kind === Kind.OBJECT_TYPE_DEFINITION ||
      typeNode.kind === Kind.INTERFACE_TYPE_DEFINITION
    ) {
      const existing = typeNode.interfaces?.find(
        i => i.name.value === change.meta.addedInterfaceName,
      );
      if (existing) {
        handleError(
          change,
          new InterfaceAlreadyExistsOnTypeError(change.meta.addedInterfaceName),
          config,
        );
      } else {
        (typeNode.interfaces as NamedTypeNode[] | undefined) = [
          ...(typeNode.interfaces ?? []),
          namedTypeNode(change.meta.addedInterfaceName),
        ];
      }
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.OBJECT_TYPE_DEFINITION, typeNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}
