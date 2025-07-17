import { ASTNode, NamedTypeNode } from 'graphql';
import { Change, ChangeType } from '@graphql-inspector/core';
import { CoordinateNotFoundError, handleError, UnionMemberAlreadyExistsError } from '../errors';
import { namedTypeNode } from '../node-templates';
import { PatchConfig } from '../types';
import { parentPath } from '../utils';

export function unionMemberAdded(
  change: Change<ChangeType.UnionMemberAdded>,
  nodeByPath: Map<string, ASTNode>,
  config: PatchConfig,
) {
  const changedPath = change.path!;
  const union = nodeByPath.get(parentPath(changedPath)) as
    | (ASTNode & { types?: NamedTypeNode[] })
    | undefined;
  if (union) {
    if (union.types?.some(n => n.name.value === change.meta.addedUnionMemberTypeName)) {
      handleError(
        change,
        new UnionMemberAlreadyExistsError(
          change.meta.unionName,
          change.meta.addedUnionMemberTypeName,
        ),
        config,
      );
    } else {
      union.types = [...(union.types ?? []), namedTypeNode(change.meta.addedUnionMemberTypeName)];
    }
  } else {
    handleError(change, new CoordinateNotFoundError(), config);
  }
}
