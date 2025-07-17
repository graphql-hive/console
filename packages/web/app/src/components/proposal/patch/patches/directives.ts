import {
  ASTNode,
  DirectiveDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  NameNode,
  parseConstValue,
  parseType,
  print,
  StringValueNode,
  TypeNode,
  ValueNode,
} from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import {
  ArgumentDefaultValueMismatchError,
  ArgumentDescriptionMismatchError,
  CoordinateAlreadyExistsError,
  CoordinateNotFoundError,
  DirectiveLocationAlreadyExistsError,
  handleError,
  KindMismatchError,
  OldTypeMismatchError,
} from '../errors';
import { nameNode, stringNode } from '../node-templates';
import { PatchConfig } from '../types';
import { parentPath } from '../utils';

export function directiveAdded(
  change: Change<ChangeType.DirectiveAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const changedNode = nodeByPath.get(changedPath);
  if (changedNode) {
    handleError(change, new CoordinateAlreadyExistsError(changedNode.kind), config);
  } else {
    const node: DirectiveDefinitionNode = {
      kind: Kind.DIRECTIVE_DEFINITION,
      name: nameNode(change.meta.addedDirectiveName),
      repeatable: change.meta.addedDirectiveRepeatable,
      locations: change.meta.addedDirectiveLocations.map(l => nameNode(l)),
      description: change.meta.addedDirectiveDescription
        ? stringNode(change.meta.addedDirectiveDescription)
        : undefined,
    };
    nodeByPath.set(changedPath, node);
  }
}

export function directiveArgumentAdded(
  change: Change<ChangeType.DirectiveArgumentAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const argumentNode = nodeByPath.get(changedPath);
  const directiveNode = nodeByPath.get(parentPath(changedPath));
  if (argumentNode) {
    handleError(change, new CoordinateAlreadyExistsError(argumentNode.kind), config);
  } else if (!directiveNode) {
    handleError(change, new CoordinateNotFoundError(), config);
  } else if (directiveNode.kind === Kind.DIRECTIVE_DEFINITION) {
    const node: InputValueDefinitionNode = {
      kind: Kind.INPUT_VALUE_DEFINITION,
      name: nameNode(change.meta.addedDirectiveArgumentName),
      type: parseType(change.meta.addedDirectiveArgumentType),
    };
    (directiveNode.arguments as InputValueDefinitionNode[] | undefined) = [
      ...(directiveNode.arguments ?? []),
      node,
    ];
    nodeByPath.set(changedPath, node);
  } else {
    handleError(
      change,
      new KindMismatchError(Kind.DIRECTIVE_DEFINITION, directiveNode.kind),
      config,
    );
  }
}

export function directiveLocationAdded(
  change: Change<ChangeType.DirectiveLocationAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const changedNode = nodeByPath.get(changedPath);
  if (changedNode) {
    if (changedNode.kind === Kind.DIRECTIVE_DEFINITION) {
      if (changedNode.locations.some(l => l.value === change.meta.addedDirectiveLocation)) {
        handleError(
          change,
          new DirectiveLocationAlreadyExistsError(
            change.meta.directiveName,
            change.meta.addedDirectiveLocation,
          ),
          config,
        );
      } else {
        (changedNode.locations as NameNode[]) = [
          ...changedNode.locations,
          nameNode(change.meta.addedDirectiveLocation),
        ];
      }
    } else {
      handleError(
        change,
        new KindMismatchError(Kind.DIRECTIVE_DEFINITION, changedNode.kind),
        config,
      );
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}

export function directiveArgumentDefaultValueChanged(
  change: Change<ChangeType.DirectiveArgumentDefaultValueChanged>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const argumentNode = nodeByPath.get(changedPath);
  if (!argumentNode) {
    handleError(change, new CoordinateNotFoundError(), config);
  } else if (argumentNode.kind === Kind.INPUT_VALUE_DEFINITION) {
    if (
      argumentNode.defaultValue &&
      print(argumentNode.defaultValue) === change.meta.oldDirectiveArgumentDefaultValue
    ) {
      (argumentNode.defaultValue as ValueNode | undefined) = change.meta
        .newDirectiveArgumentDefaultValue
        ? parseConstValue(change.meta.newDirectiveArgumentDefaultValue)
        : undefined;
    } else {
      handleError(
        change,
        new ArgumentDefaultValueMismatchError(
          change.meta.oldDirectiveArgumentDefaultValue,
          argumentNode.defaultValue && print(argumentNode.defaultValue),
        ),
        config,
      );
    }
  } else {
    handleError(
      change,
      new KindMismatchError(Kind.INPUT_VALUE_DEFINITION, argumentNode.kind),
      config,
    );
  }
}

export function directiveArgumentDescriptionChanged(
  change: Change<ChangeType.DirectiveArgumentDescriptionChanged>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const argumentNode = nodeByPath.get(changedPath);
  if (!argumentNode) {
    handleError(change, new CoordinateNotFoundError(), config);
  } else if (argumentNode.kind === Kind.INPUT_VALUE_DEFINITION) {
    if (argumentNode.description?.value === change.meta.oldDirectiveArgumentDescription) {
      handleError(
        change,
        new ArgumentDescriptionMismatchError(
          change.meta.oldDirectiveArgumentDescription,
          argumentNode.description.value,
        ),
        config,
      );
    } else {
      (argumentNode.description as StringValueNode | undefined) = change.meta
        .newDirectiveArgumentDescription
        ? stringNode(change.meta.newDirectiveArgumentDescription)
        : undefined;
    }
  } else {
    handleError(
      change,
      new KindMismatchError(Kind.INPUT_VALUE_DEFINITION, argumentNode.kind),
      config,
    );
  }
}

export function directiveArgumentTypeChanged(
  change: Change<ChangeType.DirectiveArgumentTypeChanged>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const argumentNode = nodeByPath.get(changedPath);
  if (!argumentNode) {
    handleError(change, new CoordinateNotFoundError(), config);
  } else if (argumentNode.kind === Kind.INPUT_VALUE_DEFINITION) {
    if (print(argumentNode.type) === change.meta.oldDirectiveArgumentType) {
      handleError(
        change,
        new OldTypeMismatchError(change.meta.oldDirectiveArgumentType, print(argumentNode.type)),
        config,
      );
    } else {
      (argumentNode.type as TypeNode | undefined) = parseType(change.meta.newDirectiveArgumentType);
    }
  } else {
    handleError(
      change,
      new KindMismatchError(Kind.INPUT_VALUE_DEFINITION, argumentNode.kind),
      config,
    );
  }
}
