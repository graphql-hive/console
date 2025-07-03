import {
  ArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DirectiveNode,
  GraphQLDeprecatedDirective,
  InputValueDefinitionNode,
  Kind,
  NameNode,
  StringValueNode,
  TypeNode,
  ValueNode,
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import { nameNode } from './node-templates';

export function getDeprecatedDirectiveNode(
  definitionNode: Maybe<{ readonly directives?: ReadonlyArray<DirectiveNode> }>,
): Maybe<DirectiveNode> {
  return definitionNode?.directives?.find(
    node => node.name.value === GraphQLDeprecatedDirective.name,
  );
}

export function addInputValueDefinitionArgument(
  node: Maybe<{
    arguments?: InputValueDefinitionNode[] | readonly InputValueDefinitionNode[] | undefined;
  }>,
  argumentName: string,
  type: TypeNode,
  defaultValue: ConstValueNode | undefined,
  description: StringValueNode | undefined,
  directives: ConstDirectiveNode[] | undefined,
): void {
  if (node) {
    let found = false;
    for (const arg of node.arguments ?? []) {
      if (arg.name.value === argumentName) {
        found = true;
        break;
      }
    }
    if (found) {
      console.error('Cannot patch definition that does not exist.');
      return;
    }

    node.arguments = [
      ...(node.arguments ?? []),
      {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: nameNode(argumentName),
        defaultValue,
        type,
        description,
        directives,
      },
    ];
  }
}

export function removeInputValueDefinitionArgument(
  node: Maybe<{
    arguments?: InputValueDefinitionNode[] | readonly InputValueDefinitionNode[] | undefined;
  }>,
  argumentName: string,
): void {
  if (node?.arguments) {
    node.arguments = node.arguments.filter(({ name }) => name.value !== argumentName);
  } else {
    // @todo throw and standardize error messages
    console.warn('Cannot apply input value argument removal.');
  }
}

export function setInputValueDefinitionArgument(
  node: Maybe<{
    arguments?: InputValueDefinitionNode[] | readonly InputValueDefinitionNode[] | undefined;
  }>,
  argumentName: string,
  values: {
    type?: TypeNode;
    defaultValue?: ConstValueNode | undefined;
    description?: StringValueNode | undefined;
    directives?: ConstDirectiveNode[] | undefined;
  },
): void {
  if (node) {
    let found = false;
    for (const arg of node.arguments ?? []) {
      if (arg.name.value === argumentName) {
        if (Object.hasOwn(values, 'type') && values.type !== undefined) {
          (arg.type as TypeNode) = values.type;
        }
        if (Object.hasOwn(values, 'defaultValue')) {
          (arg.defaultValue as ConstValueNode | undefined) = values.defaultValue;
        }
        if (Object.hasOwn(values, 'description')) {
          (arg.description as StringValueNode | undefined) = values.description;
        }
        if (Object.hasOwn(values, 'directives')) {
          (arg.directives as ConstDirectiveNode[] | undefined) = values.directives;
        }
        found = true;
        break;
      }
    }
    if (!found) {
      console.error('Cannot patch definition that does not exist.');
      // @todo throw error?
    }
  }
}

export function setArgument(
  node: Maybe<{ arguments?: ArgumentNode[] | readonly ArgumentNode[] | undefined }>,
  argumentName: string,
  value: ValueNode,
): void {
  if (node) {
    let found = false;
    for (const arg of node.arguments ?? []) {
      if (arg.name.value === argumentName) {
        (arg.value as ValueNode) = value;
        found = true;
        break;
      }
    }
    if (!found) {
      node.arguments = [
        ...(node.arguments ?? []),
        {
          kind: Kind.ARGUMENT,
          name: nameNode(argumentName),
          value,
        },
      ];
    }
  }
}

export function findNamedNode<T extends { readonly name: NameNode }>(
  nodes: Maybe<ReadonlyArray<T>>,
  name: string,
): T | undefined {
  return nodes?.find(value => value.name.value === name);
}

/**
 * @returns the removed node or undefined if no node matches the name.
 */
export function removeNamedNode<T extends { readonly name: NameNode }>(
  nodes: Maybe<Array<T>>,
  name: string,
): T | undefined {
  if (nodes) {
    const index = nodes?.findIndex(node => node.name.value === name);
    if (index !== -1) {
      const [deleted] = nodes.splice(index, 1);
      return deleted;
    }
  }
}

export function removeArgument(
  node: Maybe<{ arguments?: ArgumentNode[] | readonly ArgumentNode[] | undefined }>,
  argumentName: string,
): void {
  if (node?.arguments) {
    node.arguments = node.arguments.filter(arg => arg.name.value !== argumentName);
  }
}
