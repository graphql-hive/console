import type { SchemaDefinitionNode, SchemaExtensionNode } from 'graphql';
import type { Change, ChangeType } from '@graphql-inspector/core';

// @todo remove?
export type AdditionChangeType =
  | ChangeType.DirectiveAdded
  | ChangeType.DirectiveArgumentAdded
  | ChangeType.DirectiveLocationAdded
  | ChangeType.EnumValueAdded
  | ChangeType.EnumValueDeprecationReasonAdded
  | ChangeType.FieldAdded
  | ChangeType.FieldArgumentAdded
  | ChangeType.FieldDeprecationAdded
  | ChangeType.FieldDeprecationReasonAdded
  | ChangeType.FieldDescriptionAdded
  | ChangeType.InputFieldAdded
  | ChangeType.InputFieldDescriptionAdded
  | ChangeType.ObjectTypeInterfaceAdded
  | ChangeType.TypeDescriptionAdded
  | ChangeType.TypeAdded
  | ChangeType.UnionMemberAdded;

export type SchemaNode = SchemaDefinitionNode | SchemaExtensionNode;

export type TypeOfChangeType = (typeof ChangeType)[keyof typeof ChangeType];

export type ChangesByType = { [key in TypeOfChangeType]?: Array<Change<key>> };

export type PatchConfig = {
  exitOnError?: boolean;
  debug?: boolean;
};
