import { ASTNode, EnumValueDefinitionNode, isEnumType, Kind, StringValueNode } from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  CoordinateAlreadyExistsError,
  CoordinateNotFoundError,
  EnumValueNotFoundError,
  handleError,
  KindMismatchError,
  OldValueMismatchError,
} from '../errors';
import { nameNode, stringNode } from '../node-templates';
import type { PatchConfig } from '../types';
import { getDeprecatedDirectiveNode, parentPath, upsertArgument } from '../utils';

export function enumValueRemoved(
  removal: Change<ChangeType.EnumValueRemoved>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = removal.path!;
  const typeNode = nodeByPath.get(parentPath(changedPath)) as
    | (ASTNode & { values?: EnumValueDefinitionNode[] })
    | undefined;
  if (!typeNode) {
    handleError(removal, new CoordinateNotFoundError(), config);
  } else if (!isEnumType(typeNode)) {
    handleError(removal, new KindMismatchError(Kind.ENUM_TYPE_DEFINITION, typeNode.kind), config);
  } else if (!typeNode.values?.length) {
    handleError(
      removal,
      new EnumValueNotFoundError(removal.meta.enumName, removal.meta.removedEnumValueName),
      config,
    );
  } else {
    const beforeLength = typeNode.values.length;
    typeNode.values = typeNode.values.filter(
      f => f.name.value !== removal.meta.removedEnumValueName,
    );
    if (beforeLength === typeNode.values.length) {
      handleError(
        removal,
        new EnumValueNotFoundError(removal.meta.enumName, removal.meta.removedEnumValueName),
        config,
      );
    } else {
      // delete the reference to the removed field.
      nodeByPath.delete(changedPath);
    }
  }
}

export function enumValueAdded(
  change: Change<ChangeType.EnumValueAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const enumValuePath = change.path!;
  const enumNode = nodeByPath.get(parentPath(enumValuePath)) as
    | (ASTNode & { values: EnumValueDefinitionNode[] })
    | undefined;
  const changedNode = nodeByPath.get(enumValuePath);
  if (!enumNode) {
    handleError(change, new CoordinateNotFoundError(), config);
    console.warn(
      `Cannot apply change: ${change.type} to ${enumValuePath}. Parent type is missing.`,
    );
  } else if (changedNode) {
    handleError(change, new CoordinateAlreadyExistsError(changedNode.kind), config);
  } else if (enumNode.kind !== Kind.ENUM_TYPE_DEFINITION) {
    handleError(change, new KindMismatchError(Kind.ENUM_TYPE_DEFINITION, enumNode.kind), config);
  } else {
    const c = change as Change<ChangeType.EnumValueAdded>;
    const node: EnumValueDefinitionNode = {
      kind: Kind.ENUM_VALUE_DEFINITION,
      name: nameNode(c.meta.addedEnumValueName),
      description: c.meta.addedDirectiveDescription
        ? stringNode(c.meta.addedDirectiveDescription)
        : undefined,
    };
    (enumNode.values as EnumValueDefinitionNode[]) = [...(enumNode.values ?? []), node];
    nodeByPath.set(enumValuePath, node);
  }
}

export function enumValueDeprecationReasonAdded(
  change: Change<ChangeType.EnumValueDeprecationReasonAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const enumValueNode = nodeByPath.get(changedPath);
  if (enumValueNode) {
    if (enumValueNode.kind === Kind.ENUM_VALUE_DEFINITION) {
      const deprecation = getDeprecatedDirectiveNode(enumValueNode);
      if (deprecation) {
        const argNode = upsertArgument(
          deprecation,
          'reason',
          stringNode(change.meta.addedValueDeprecationReason),
        );
        nodeByPath.set(`${changedPath}.reason`, argNode);
      } else {
        handleError(change, new CoordinateNotFoundError(), config);
      }
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.ENUM_VALUE_DEFINITION, enumValueNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new EnumValueNotFoundError(change.meta.enumName), config);
  }
}

export function enumValueDescriptionChanged(
  change: Change<ChangeType.EnumValueDescriptionChanged>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const enumValueNode = nodeByPath.get(changedPath);
  if (enumValueNode) {
    if (enumValueNode.kind === Kind.ENUM_VALUE_DEFINITION) {
      if (change.meta.oldEnumValueDescription !== enumValueNode.description?.value) {
        handleError(
          change,
          new OldValueMismatchError(
            change.meta.oldEnumValueDescription,
            enumValueNode.description?.value,
          ),
          config,
        );
      } else {
        (enumValueNode.description as StringValueNode | undefined) = change.meta
          .newEnumValueDescription
          ? stringNode(change.meta.newEnumValueDescription)
          : undefined;
      }
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.ENUM_VALUE_DEFINITION, enumValueNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new EnumValueNotFoundError(change.meta.enumName), config);
  }
}
