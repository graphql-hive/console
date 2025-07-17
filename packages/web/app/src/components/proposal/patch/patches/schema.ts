import { NameNode, OperationTypeNode } from 'graphql';
import type { Change, ChangeType } from '@graphql-inspector/core';
import { CoordinateNotFoundError, handleError, OldTypeMismatchError } from '../errors';
import { nameNode } from '../node-templates';
import { PatchConfig, SchemaNode } from '../types';

export function schemaMutationTypeChanged(
  change: Change<ChangeType.SchemaMutationTypeChanged>,
  schemaNodes: SchemaNode[],
  config: PatchConfig,
) {
  // @todo handle type extensions correctly
  for (const schemaNode of schemaNodes) {
    const mutation = schemaNode.operationTypes?.find(
      ({ operation }) => operation === OperationTypeNode.MUTATION,
    );
    if (!mutation) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (mutation.type.name.value === change.meta.oldMutationTypeName) {
      (mutation.type.name as NameNode) = nameNode(change.meta.newMutationTypeName);
    } else {
      handleError(
        change,
        new OldTypeMismatchError(change.meta.oldMutationTypeName, mutation?.type.name.value),
        config,
      );
    }
  }
}

export function schemaQueryTypeChanged(
  change: Change<ChangeType.SchemaQueryTypeChanged>,
  schemaNodes: SchemaNode[],
  config: PatchConfig,
) {
  // @todo handle type extensions correctly
  for (const schemaNode of schemaNodes) {
    const query = schemaNode.operationTypes?.find(
      ({ operation }) => operation === OperationTypeNode.MUTATION,
    );
    if (!query) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (query.type.name.value === change.meta.oldQueryTypeName) {
      (query.type.name as NameNode) = nameNode(change.meta.newQueryTypeName);
    } else {
      handleError(
        change,
        new OldTypeMismatchError(change.meta.oldQueryTypeName, query?.type.name.value),
        config,
      );
    }
  }
}

export function schemaSubscriptionTypeChanged(
  change: Change<ChangeType.SchemaSubscriptionTypeChanged>,
  schemaNodes: SchemaNode[],
  config: PatchConfig,
) {
  // @todo handle type extensions correctly
  for (const schemaNode of schemaNodes) {
    const sub = schemaNode.operationTypes?.find(
      ({ operation }) => operation === OperationTypeNode.MUTATION,
    );
    if (!sub) {
      handleError(change, new CoordinateNotFoundError(), config);
    } else if (sub.type.name.value === change.meta.oldSubscriptionTypeName) {
      (sub.type.name as NameNode) = nameNode(change.meta.newSubscriptionTypeName);
    } else {
      handleError(
        change,
        new OldTypeMismatchError(change.meta.oldSubscriptionTypeName, sub?.type.name.value),
        config,
      );
    }
  }
}
