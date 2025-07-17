import { ASTNode, InputValueDefinitionNode, Kind, parseType, StringValueNode } from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  CoordinateAlreadyExistsError,
  CoordinateNotFoundError,
  handleError,
  KindMismatchError,
} from '../errors';
import { nameNode, stringNode } from '../node-templates';
import type { PatchConfig } from '../types';
import { parentPath } from '../utils';

export function inputFieldAdded(
  change: Change<ChangeType.InputFieldAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const inputFieldPath = change.path!;
  const existingNode = nodeByPath.get(inputFieldPath);
  if (existingNode) {
    handleError(change, new CoordinateAlreadyExistsError(existingNode.kind), config);
  } else {
    const typeNode = nodeByPath.get(parentPath(inputFieldPath)) as ASTNode & {
      fields?: InputValueDefinitionNode[];
    };
    if (!typeNode) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (typeNode.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION) {
      handleError(
        change,
        new KindMismatchError(Kind.INPUT_OBJECT_TYPE_DEFINITION, typeNode.kind),
        config,
      );
    } else {
      const node: InputValueDefinitionNode = {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: nameNode(change.meta.addedInputFieldName),
        type: parseType(change.meta.addedInputFieldType),
        description: change.meta.addedInputFieldDescription
          ? stringNode(change.meta.addedInputFieldDescription)
          : undefined,
      };

      typeNode.fields = [...(typeNode.fields ?? []), node];

      // add new field to the node set
      nodeByPath.set(inputFieldPath, node);
    }
  }
}

export function inputFieldDescriptionAdded(
  change: Change<ChangeType.InputFieldDescriptionAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const inputFieldPath = change.path!;
  const existingNode = nodeByPath.get(inputFieldPath);
  if (existingNode) {
    if (existingNode.kind === Kind.INPUT_VALUE_DEFINITION) {
      (existingNode.description as StringValueNode | undefined) = stringNode(
        change.meta.addedInputFieldDescription,
      );
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.INPUT_VALUE_DEFINITION, existingNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function inputFieldDescriptionRemoved(
  change: Change<ChangeType.InputFieldDescriptionRemoved>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const inputFieldPath = change.path!;
  const existingNode = nodeByPath.get(inputFieldPath);
  if (existingNode) {
    if (existingNode.kind === Kind.INPUT_VALUE_DEFINITION) {
      if (existingNode.description === undefined) {
        console.warn(
          `Cannot remove a description at ${change.path} because no description is set.`,
        );
      } else if (existingNode.description.value !== change.meta.removedDescription) {
        console.warn(
          `Description at ${change.path} does not match expected description, but proceeding with description removal anyways.`,
        );
      }
      (existingNode.description as StringValueNode | undefined) = undefined;
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.INPUT_VALUE_DEFINITION, existingNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}
