// list of intermediary definitions, used to build up the diff details before rendering.
// This is an important step because it separates the rendering logic from the diff calculation.
import { useMemo } from 'react';
import {
  ConstArgumentNode,
  ConstDirectiveNode,
  DirectiveLocation,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLUnionType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isScalarType,
  isSpecifiedDirective,
  isUnionType,
  Kind,
  print,
  type GraphQLDirective,
  type GraphQLSchema,
} from 'graphql';
import { isPrintableAsBlockString } from 'graphql/language/blockString';
import { isPrimitive } from '@graphql-inspector/core/utils/graphql';
import { Builder, createBuilder } from './builder';
import { compareDirectiveLists, compareLists, diffArrays, matchArrays } from './compare-lists';
import { ChangeDocument } from './components';
import { Line, LineGroup, LineProps } from './lines';
import { determineChangeType, lineToWordChange, printDefault } from './util';
import {
  description,
  field,
  keyword,
  literal,
  location,
  SPACE,
  type,
  typeName,
  WordProps,
} from './words';

export function SchemaDiff({
  before,
  after,
  className,
}: {
  before: GraphQLSchema | null;
  after: GraphQLSchema | null;
  className?: string;
  // annotations?: (coordinate: string) => ReactElement | null;
}) {
  const lines = useMemo(() => {
    const {
      added: addedTypes,
      mutual: mutualTypes,
      removed: removedTypes,
    } = compareLists(
      Object.values(before?.getTypeMap() ?? {}).filter(
        t => !isPrimitive(t) && !isIntrospectionType(t),
      ),
      Object.values(after?.getTypeMap() ?? {}).filter(
        t => !isPrimitive(t) && !isIntrospectionType(t),
      ),
    );

    const {
      added: addedDirectives,
      mutual: mutualDirectives,
      removed: removedDirectives,
    } = compareLists(
      before?.getDirectives().filter(d => !isSpecifiedDirective(d)) ?? [],
      after?.getDirectives().filter(d => !isSpecifiedDirective(d)) ?? [],
    );

    const builder = createBuilder();
    removedDirectives.map(d =>
      diffDirective({
        newDirective: null,
        oldDirective: d,
        builder,
      }),
    );
    addedDirectives.map(d =>
      diffDirective({
        newDirective: d,
        oldDirective: null,
        builder,
      }),
    );
    mutualDirectives.map(d =>
      diffDirective({
        newDirective: d.newVersion,
        oldDirective: d.oldVersion,
        builder,
      }),
    );
    schemaDefinitionDiff({
      oldSchema: before,
      newSchema: after,
      builder,
    });
    removedTypes.map(a => {
      diffType({
        oldType: a,
        newType: null,
        builder,
      });
    });
    addedTypes.map(a => {
      diffType({
        oldType: null,
        newType: a,
        builder,
      });
    });
    mutualTypes.map(a => {
      diffType({
        oldType: a.oldVersion,
        newType: a.newVersion,
        builder,
      });
    });

    const isSameChange = (
      a: 'removal' | 'addition' | 'mutual' | 'no change' | undefined,
      b: 'removal' | 'addition' | 'mutual' | 'no change' | undefined,
    ) => (a ?? 'no change') === (b ?? 'no change');
    return builder.getLines().reduce((groups, line) => {
      const lastGroup = groups.at(-1);
      if (!lastGroup) {
        groups.push([line]);
      } else if (isSameChange(lastGroup.at(-1)?.change, line.change)) {
        // if this is the same change type, then add it to the last group
        lastGroup?.push(line);
      } else {
        // if this is a different change type, then create a new group
        groups.push([line]);
      }
      return groups;
    }, [] as LineProps[][]);
  }, [before, after]);

  let beforeLine = 0;
  let afterLine = 0;

  return (
    <ChangeDocument className={className}>
      {lines.map((group, i) => (
        <LineGroup key={`group-${i}`} collapsible={group[0]?.change === 'no change'}>
          {group.map((line, j) => {
            if (line.change !== 'addition') {
              beforeLine += 1;
            }
            if (line.change !== 'removal') {
              afterLine += 1;
            }
            return (
              <Line
                beforeLine={beforeLine}
                afterLine={afterLine}
                {...line}
                key={`line-${i}-${j}`}
              />
            );
          })}
        </LineGroup>
      ))}
    </ChangeDocument>
  );
}

type RootFieldsType = {
  query: GraphQLField<any, any> | null;
  mutation: GraphQLField<any, any> | null;
  subscription: GraphQLField<any, any> | null;
};

function schemaDefinitionDiff({
  oldSchema,
  newSchema,
  builder,
}: {
  oldSchema: GraphQLSchema | undefined | null;
  newSchema: GraphQLSchema | undefined | null;
  builder: Builder;
}) {
  const oldQuery = oldSchema?.getQueryType();
  const oldMutation = oldSchema?.getMutationType();
  const oldSubscription = oldSchema?.getSubscriptionType();
  const oldRoot: RootFieldsType = {
    query: oldQuery
      ? {
          args: [],
          name: 'query',
          type: oldQuery,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
    mutation: oldMutation
      ? {
          args: [],
          name: 'mutation',
          type: oldMutation,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
    subscription: oldSubscription
      ? {
          args: [],
          name: 'subscription',
          type: oldSubscription,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
  };

  const newQuery = newSchema?.getQueryType();
  const newMutation = newSchema?.getMutationType();
  const newSubscription = newSchema?.getSubscriptionType();
  const newRoot: RootFieldsType = {
    query: newQuery
      ? {
          args: [],
          name: 'query',
          type: newQuery,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
    mutation: newMutation
      ? {
          args: [],
          name: 'mutation',
          type: newMutation,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
    subscription: newSubscription
      ? {
          args: [],
          name: 'subscription',
          type: newSubscription,
          astNode: null,
          deprecationReason: null,
          description: null,
          extensions: {},
        }
      : null,
  };
  const path = [''];
  const changeType = determineChangeType(oldSchema, newSchema);

  const newSchemaDef = [oldRoot.mutation, oldRoot.query, oldRoot.subscription].every(
    field => field === null,
  );
  const removedSchemaDef = [newRoot.mutation, newRoot.query, newRoot.subscription].every(
    field => field === null,
  );
  const schemaDefType = newSchemaDef ? 'addition' : removedSchemaDef ? 'removal' : 'mutual';

  // add an additional line for spacing
  builder.newLine({ type: changeType });
  builder.newLine({ type: changeType });
  builder.write(keyword('schema'), SPACE, literal('{'));

  if (oldRoot.query || newRoot.query) {
    diffField({
      oldField: oldRoot.query,
      newField: newRoot.query!,
      parentPath: path,
      builder,
    });
  }
  if (oldRoot.mutation || newRoot.mutation) {
    diffField({
      oldField: oldRoot.mutation,
      newField: newRoot.mutation!,
      parentPath: path,
      builder,
    });
  }
  if (oldRoot.subscription || newRoot.subscription) {
    diffField({
      oldField: oldRoot.subscription,
      newField: newRoot.subscription!,
      parentPath: path,
      builder,
    });
  }
  builder.newLine({
    type: schemaDefType,
  });
  builder.write(literal('}'));
}

function directiveName(props: {
  name: string;
  changeType: WordProps['change'];
  path: string[];
}): WordProps {
  return {
    change: lineToWordChange(props.changeType ?? 'no change'),
    kind: 'type',
    text: `@${props.name}`,
    coordinate: props.path.join('.'),
  };
}

function diffEnumValue({
  parentPath,
  oldValue,
  newValue,
  builder,
}: {
  parentPath: string[];
  oldValue: GraphQLEnumValue | null;
  newValue: GraphQLEnumValue | null;
  builder: Builder;
}) {
  const changeType = determineChangeType(oldValue, newValue);
  const name = oldValue?.name ?? newValue?.name ?? '';

  diffDescription({
    newNode: newValue!,
    oldNode: oldValue!,
    indent: 1,
    builder,
  });
  builder.newLine({
    type: changeType,
    indent: 1,
  });
  const coordinate = [...parentPath, name];
  builder.write(type(name, coordinate.join('.')));
  diffDirectiveUsages({
    newDirectives: newValue?.astNode?.directives ?? [],
    oldDirectives: oldValue?.astNode?.directives ?? [],
    builder,
    path: coordinate,
  });
}

function diffEnum({
  oldEnum,
  newEnum,
  builder,
}: {
  oldEnum: GraphQLEnumType | null;
  newEnum: GraphQLEnumType | null;
  builder: Builder;
}) {
  const { added, mutual, removed } = compareLists(
    oldEnum?.getValues() ?? [],
    newEnum?.getValues() ?? [],
  );

  const changeType = determineChangeType(oldEnum, newEnum);
  const name = oldEnum?.name ?? newEnum?.name ?? '';

  builder.newLine({
    type: changeType,
  });

  diffDescription({
    newNode: newEnum!,
    oldNode: oldEnum!,
    builder,
  });

  builder.newLine({
    type: changeType,
  });

  builder.write(keyword('enum'), SPACE, type(name, name), SPACE, literal('{'));
  for (const a of removed) {
    diffEnumValue({
      newValue: null,
      oldValue: a,
      parentPath: [name],
      builder,
    });
  }
  for (const a of added) {
    diffEnumValue({
      newValue: a,
      oldValue: null,
      parentPath: [name],
      builder,
    });
  }
  for (const a of mutual) {
    diffEnumValue({
      newValue: a.newVersion,
      oldValue: a.oldVersion,
      parentPath: [name],
      builder,
    });
  }
  builder.newLine({
    type: changeType,
  });
  builder.write(literal('}'));
}

function diffUnion({
  oldUnion,
  newUnion,
  builder,
}: {
  oldUnion: GraphQLUnionType | null;
  newUnion: GraphQLUnionType | null;
  builder: Builder;
}) {
  const { added, mutual, removed } = compareLists(
    oldUnion?.getTypes() ?? [],
    newUnion?.getTypes() ?? [],
  );

  const changeType = determineChangeType(oldUnion, newUnion);
  const name = oldUnion?.name ?? newUnion?.name ?? '';
  const path = [name];

  builder.newLine({ type: changeType });
  diffDescription({
    newNode: newUnion!,
    oldNode: oldUnion!,
    builder,
  });
  builder.newLine({ type: changeType });
  builder.write(
    keyword('union', lineToWordChange(changeType)),
    SPACE,
    type(name, lineToWordChange(changeType)),
  );
  diffDirectiveUsages({
    newDirectives: newUnion?.astNode?.directives ?? [],
    oldDirectives: oldUnion?.astNode?.directives ?? [],
    builder,
    path,
  });
  builder.write(keyword(' = '));
  for (const a of removed) {
    builder.newLine({
      type: 'removal',
      indent: 1,
    });
    builder.write(literal('| ', 'removal'), type(a.name, [...path, a.name].join('.'), 'removal'));
  }

  for (const a of added) {
    builder.newLine({
      type: 'addition',
      indent: 1,
    });
    builder.write(literal('| ', 'addition'), type(a.name, [...path, a.name].join('.'), 'addition'));
  }

  for (const a of mutual) {
    builder.newLine({
      type: 'mutual',
      indent: 1,
    });

    builder.write(literal('| '));
    diffTypeStr({
      newType: a.newVersion.name,
      oldType: a.oldVersion.name,
      builder,
    });
  }
}

function diffInputField({
  parentPath,
  oldField,
  newField,
  builder,
}:
  | {
      parentPath: string[];
      oldField: GraphQLInputField | null;
      newField: GraphQLInputField;
      builder: Builder;
    }
  | {
      parentPath: string[];
      oldField: GraphQLInputField;
      newField: GraphQLInputField | null;
      builder: Builder;
    }) {
  const changeType = determineChangeType(oldField, newField);
  const name = newField?.name ?? oldField?.name ?? '';
  const path = [...parentPath, name];
  builder.newLine({ type: changeType, indent: 1 });
  diffDescription({
    newNode: newField!,
    oldNode: oldField!,
    indent: 1,
    builder,
  });
  builder.newLine({ type: changeType, indent: 1 });
  builder.write(field(name, path.join('.'), lineToWordChange(changeType)), literal(':'), SPACE);
  diffReturnType({
    newType: newField?.type,
    oldType: oldField?.type!, // eslint-disable-line
    builder,
  });
  diffDirectiveUsages({
    newDirectives: newField?.astNode?.directives ?? [],
    oldDirectives: oldField?.astNode?.directives ?? [],
    builder,
    path,
  });
}

function diffInputObject({
  oldInput,
  newInput,
  builder,
}:
  | {
      oldInput: GraphQLInputObjectType | null;
      newInput: GraphQLInputObjectType;
      builder: Builder;
    }
  | {
      oldInput: GraphQLInputObjectType;
      newInput: GraphQLInputObjectType | null;
      builder: Builder;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldInput?.getFields() ?? {}),
    Object.values(newInput?.getFields() ?? {}),
  );
  const changeType = determineChangeType(oldInput, newInput);
  const name = oldInput?.name ?? newInput?.name ?? '';
  const path = [name];
  builder.newLine({ type: changeType });
  diffDescription({
    newNode: newInput!,
    oldNode: oldInput!,
    builder,
  });
  builder.newLine({ type: changeType });
  builder.write(keyword('input'), SPACE, type(name, name));
  diffDirectiveUsages({
    newDirectives: newInput?.astNode?.directives ?? [],
    oldDirectives: oldInput?.astNode?.directives ?? [],
    builder,
    path,
  });
  builder.write(keyword(' {'));

  for (const a of removed) {
    diffInputField({
      oldField: a,
      newField: null,
      parentPath: path,
      builder,
    });
  }
  for (const a of added) {
    diffInputField({
      oldField: null,
      newField: a,
      parentPath: path,
      builder,
    });
  }
  for (const a of mutual) {
    diffInputField({
      oldField: a.oldVersion,
      newField: a.newVersion,
      parentPath: path,
      builder,
    });
  }
  builder.newLine({ type: changeType });
  builder.write(literal('}'));
}

function diffInterfaces(props: {
  oldInterfaces: readonly GraphQLInterfaceType[];
  newInterfaces: readonly GraphQLInterfaceType[];
  builder: Builder;
}) {
  if (props.oldInterfaces.length + props.newInterfaces.length === 0) {
    return null;
  }
  const { added, mutual, removed } = compareLists(props.oldInterfaces, props.newInterfaces);

  let implementsChangeType: 'mutual' | 'addition' | 'removal';
  if (props.oldInterfaces.length === 0 && props.newInterfaces.length !== 0) {
    implementsChangeType = 'addition';
  } else if (props.oldInterfaces.length !== 0 && props.newInterfaces.length === 0) {
    implementsChangeType = 'removal';
  } else {
    implementsChangeType = 'mutual';
  }
  const write = props.builder.write;

  write(keyword(' implements ', lineToWordChange(implementsChangeType)));
  for (let i = 0; i < removed.length; i++) {
    const r = removed[i];
    if (i !== 0) {
      write(keyword(' & '));
    }
    write(typeName(r.name, 'removal'));
  }
  for (let i = 0; i < added.length; i++) {
    const r = added[i];
    if (removed.length !== 0 || i !== 0) {
      write(keyword(' & '));
    }
    write(typeName(r.name, 'addition'));
  }
  for (let i = 0; i < mutual.length; i++) {
    const r = mutual[i];
    if (removed.length !== 0 || added.length !== 0 || i !== 0) {
      write(keyword(' & '));
    }
    write(typeName(r.newVersion.name));
  }
}

function diffField({
  parentPath,
  oldField,
  newField,
  builder,
}:
  | {
      parentPath: string[];
      oldField: GraphQLField<any, any, any> | null;
      newField: GraphQLField<any, any, any>;
      builder: Builder;
    }
  | {
      parentPath: string[];
      oldField: GraphQLField<any, any, any>;
      newField: GraphQLField<any, any, any> | null;
      builder: Builder;
    }) {
  const hasNewArgs = !!newField?.args.length;
  const hasOldArgs = !!oldField?.args.length;
  const hasArgs = hasNewArgs || hasOldArgs;
  const argsChangeType = hasNewArgs
    ? hasOldArgs
      ? 'mutual'
      : 'addition'
    : hasOldArgs
      ? 'removal'
      : 'mutual';
  const name = newField?.name ?? oldField?.name ?? '';
  const changeType = determineChangeType(oldField, newField);
  const path = [...parentPath, name];
  diffDescription({
    newNode: newField!,
    oldNode: oldField!,
    indent: 1,
    builder,
  });
  builder.newLine({ type: changeType, indent: 1 });
  builder.write(field(name, path.join('.'), lineToWordChange(changeType)));
  if (hasArgs) {
    builder.write(literal('(', lineToWordChange(argsChangeType)));
    diffArguments({
      newArgs: newField?.args ?? [],
      oldArgs: oldField?.args ?? [],
      indent: 2,
      parentPath: path,
      builder,
    });
    builder.newLine({ type: argsChangeType, indent: 1 });
    builder.write(keyword(')', lineToWordChange(argsChangeType)));
  }
  builder.write(keyword(':'), SPACE);
  diffReturnType({
    newType: newField?.type,
    oldType: oldField?.type!, // eslint-disable-line
    builder,
  });
  diffDirectiveUsages({
    newDirectives: newField?.astNode?.directives ?? [],
    oldDirectives: oldField?.astNode?.directives ?? [],
    builder,
    path,
  });
}

function diffObject({
  oldObject,
  newObject,
  builder,
}:
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType | null;
      newObject: GraphQLObjectType | GraphQLInterfaceType;
      builder: Builder;
    }
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType;
      newObject: GraphQLObjectType | GraphQLInterfaceType | null;
      builder: Builder;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldObject?.getFields() ?? {}),
    Object.values(newObject?.getFields() ?? {}),
  );
  const name = oldObject?.name ?? newObject?.name ?? '';
  const changeType = determineChangeType(oldObject, newObject);
  const path = [name];

  builder.newLine({ type: changeType });
  diffDescription({
    newNode: newObject!,
    oldNode: oldObject!,
    builder,
  });
  builder.newLine({ type: changeType });
  builder.write(keyword(isInterfaceType(newObject) ? 'interface' : 'type'), SPACE, typeName(name));
  diffDirectiveUsages({
    newDirectives: newObject?.astNode?.directives ?? [],
    oldDirectives: oldObject?.astNode?.directives ?? [],
    builder,
    path,
  });
  diffInterfaces({
    newInterfaces: newObject?.getInterfaces() ?? [],
    oldInterfaces: oldObject?.getInterfaces() ?? [],
    builder,
  });
  builder.write(SPACE, literal('{'));
  for (const a of removed) {
    diffField({
      oldField: a,
      newField: null,
      parentPath: path,
      builder,
    });
  }
  for (const a of added) {
    diffField({
      oldField: null,
      newField: a,
      parentPath: path,
      builder,
    });
  }

  for (const a of mutual) {
    diffField({
      oldField: a.oldVersion,
      newField: a.newVersion,
      parentPath: path,
      builder,
    });
  }
  builder.newLine({ type: changeType });
  builder.write(literal('}'));
}

function diffScalar({
  oldScalar,
  newScalar,
  builder,
}:
  | {
      oldScalar: GraphQLScalarType;
      newScalar: GraphQLScalarType | null;
      builder: Builder;
    }
  | {
      oldScalar: GraphQLScalarType | null;
      newScalar: GraphQLScalarType;
      builder: Builder;
    }) {
  const changeType = determineChangeType(oldScalar, newScalar);
  const name = newScalar?.name ?? oldScalar?.name ?? '';
  builder.newLine({ type: changeType });
  diffDescription({
    oldNode: oldScalar!,
    newNode: newScalar,
    builder,
  });
  builder.newLine({ type: changeType });
  builder.write(keyword('scalar'), SPACE, typeName(name, lineToWordChange(changeType)));
  diffDirectiveUsages({
    newDirectives: newScalar?.astNode?.directives ?? [],
    oldDirectives: oldScalar?.astNode?.directives ?? [],
    builder,
    path: [name],
  });
}

function diffType({
  oldType,
  newType,
  builder,
}:
  | {
      oldType: GraphQLNamedType;
      newType: GraphQLNamedType | null;
      builder: Builder;
    }
  | {
      oldType: GraphQLNamedType | null;
      newType: GraphQLNamedType;
      builder: Builder;
    }) {
  if ((isEnumType(oldType) || oldType === null) && (isEnumType(newType) || newType === null)) {
    diffEnum({
      oldEnum: oldType,
      newEnum: newType,
      builder,
    });
    return;
  }
  if ((isUnionType(oldType) || oldType === null) && (isUnionType(newType) || newType === null)) {
    diffUnion({
      oldUnion: oldType,
      newUnion: newType,
      builder,
    });
    return;
  }
  if (
    (isInputObjectType(oldType) || oldType === null) &&
    (isInputObjectType(newType) || newType === null)
  ) {
    diffInputObject({
      oldInput: oldType!,
      newInput: newType!,
      builder,
    });
    return;
  }
  if ((isObjectType(oldType) || oldType === null) && (isObjectType(newType) || newType === null)) {
    diffObject({
      oldObject: oldType!,
      newObject: newType!,
      builder,
    });
    return;
  }
  if (
    (isInterfaceType(oldType) || oldType === null) &&
    (isInterfaceType(newType) || newType === null)
  ) {
    diffObject({
      oldObject: oldType!,
      newObject: newType!,
      builder,
    });
    return;
  }
  if ((isScalarType(oldType) || oldType === null) && (isScalarType(newType) || newType === null)) {
    diffScalar({
      oldScalar: oldType!,
      newScalar: newType!,
      builder,
    });
    return;
  }
}

function diffRepeatable(
  props:
    | {
        oldDirective: GraphQLDirective | null;
        newDirective: GraphQLDirective;
        builder: Builder;
      }
    | {
        oldDirective: GraphQLDirective;
        newDirective: GraphQLDirective | null;
        builder: Builder;
      },
) {
  const write = props.builder.write;
  const oldRepeatable = !!props.oldDirective?.isRepeatable;
  const newRepeatable = !!props.newDirective?.isRepeatable;

  if (oldRepeatable === newRepeatable) {
    if (newRepeatable === true) {
      write(keyword('repeatable'), SPACE);
    }
  } else {
    if (oldRepeatable) {
      write(keyword('repeatable', 'removal'), ...(newRepeatable ? [] : [SPACE]));
    }
    if (newRepeatable) {
      write(keyword('repeatable', 'addition'), SPACE);
    }
  }
}

function diffLocations(props: {
  newLocations: readonly DirectiveLocation[];
  oldLocations: readonly DirectiveLocation[];
  builder: Builder;
}) {
  const locations = {
    added: diffArrays(props.newLocations, props.oldLocations),
    removed: diffArrays(props.oldLocations, props.newLocations),
    mutual: matchArrays(props.oldLocations, props.newLocations),
  };

  const locationElements = [
    ...locations.removed.map(l => location(l, 'removal')),
    ...locations.added.map(l => location(l, 'addition')),
    ...locations.mutual.map(l => location(l)),
  ];

  props.builder.write(
    ...locationElements.flatMap((l, i) => [
      l,
      ...(i !== locationElements.length - 1 ? [keyword(' | ')] : []),
    ]),
  );
}

export function diffDirective(
  props:
    | {
        oldDirective: GraphQLDirective | null;
        newDirective: GraphQLDirective;
        builder: Builder;
      }
    | {
        oldDirective: GraphQLDirective;
        newDirective: GraphQLDirective | null;
        builder: Builder;
      },
) {
  const write = props.builder.write;
  const changeType = determineChangeType(props.oldDirective, props.newDirective);
  const newLine = () => props.builder.newLine({ type: changeType });
  const name = props.newDirective?.name ?? props.oldDirective?.name ?? '';
  const hasNewArgs = !!props.newDirective?.args.length;
  const hasOldArgs = !!props.oldDirective?.args.length;
  const hasArgs = hasNewArgs || hasOldArgs;
  const argsChangeType = hasNewArgs
    ? hasOldArgs
      ? 'mutual'
      : 'addition'
    : hasOldArgs
      ? 'removal'
      : 'mutual';

  const path = [`@${name}`];
  newLine();
  diffDescription({
    newNode: props.newDirective!,
    oldNode: props.oldDirective!,
    builder: props.builder,
  });
  newLine();
  write(
    keyword('directive'),
    SPACE,
    directiveName({ name, path, changeType: lineToWordChange(changeType) }),
    ...(hasArgs ? [literal('(', lineToWordChange(argsChangeType))] : []),
  );

  diffArguments({
    parentPath: path,
    oldArgs: props.oldDirective?.args ?? [],
    newArgs: props.newDirective?.args ?? [],
    indent: 1,
    builder: props.builder,
  });

  props.builder.newLine({ type: changeType });
  write(literal(')', lineToWordChange(argsChangeType)), SPACE);

  diffRepeatable({
    oldDirective: props.oldDirective!,
    newDirective: props.newDirective!,
    builder: props.builder,
  });

  write(keyword('on'), SPACE);

  diffLocations({
    oldLocations: props.oldDirective?.locations ?? [],
    newLocations: props.newDirective?.locations ?? [],
    builder: props.builder,
  });
}

function diffTypeStr({
  oldType,
  newType,
  builder,
}: {
  oldType: string | null;
  newType: string | null;
  builder: Builder;
}) {
  if (!!newType && oldType === newType) {
    builder.write(typeName(newType));
    return;
  }
  if (oldType) {
    builder.write(typeName(oldType, 'removal'));
  }
  if (newType) {
    if (oldType) {
      builder.write(SPACE); // add some spacing between the changes
    }
    builder.write(typeName(newType, 'addition'));
  }
}

function diffArgumentAST({
  oldArg,
  newArg,
  builder,
  path,
}: {
  oldArg: ConstArgumentNode | null;
  newArg: ConstArgumentNode | null;
  builder: Builder;
  path: string[];
}) {
  const name = oldArg?.name.value ?? newArg?.name.value ?? '';
  const oldType = oldArg && print(oldArg.value);
  const newType = newArg && print(newArg.value);
  const changeType = lineToWordChange(determineChangeType(oldType, newType));

  builder.write(field(name, [...path, name].join('.'), changeType), literal(': ', changeType));

  diffTypeStr({
    oldType,
    newType,
    builder,
  });
}

function diffDirectiveUsage(
  props:
    | {
        oldDirective: ConstDirectiveNode | null;
        newDirective: ConstDirectiveNode;
        builder: Builder;
        path: string[];
      }
    | {
        oldDirective: ConstDirectiveNode;
        newDirective: ConstDirectiveNode | null;
        builder: Builder;
        path: string[];
      },
) {
  const name = `@${props.newDirective?.name.value ?? props.oldDirective?.name.value ?? ''}`;
  const newArgs = props.newDirective?.arguments ?? [];
  const oldArgs = props.oldDirective?.arguments ?? [];
  const hasNewArgs = !!newArgs.length;
  const hasOldArgs = !!oldArgs.length;
  const hasArgs = hasNewArgs || hasOldArgs;
  const argsChangeType = hasNewArgs
    ? hasOldArgs
      ? 'mutual'
      : 'addition'
    : hasOldArgs
      ? 'removal'
      : 'mutual';
  const changeType = determineChangeType(props.oldDirective, props.newDirective);
  const { added, mutual, removed } = compareLists(oldArgs, newArgs);

  props.builder.write(
    SPACE,
    typeName(name, lineToWordChange(changeType)),
    ...(hasArgs ? [literal('(', lineToWordChange(argsChangeType))] : []),
  );

  const directivePath = [...props.path, name];

  for (let i = 0; i < removed.length; i++) {
    diffArgumentAST({
      oldArg: removed[i],
      newArg: null,
      builder: props.builder,
      path: directivePath,
    });
    if (i !== removed.length || added.length || mutual.length) {
      props.builder.write(literal(', ', 'removal'));
    }
  }

  for (let i = 0; i < added.length; i++) {
    diffArgumentAST({
      oldArg: null,
      newArg: added[i],
      builder: props.builder,
      path: directivePath,
    });
    if (i !== added.length - 1 || mutual.length) {
      props.builder.write(literal(', ', 'addition'));
    }
  }

  for (let i = 0; i < mutual.length; i++) {
    const r = mutual[i];
    diffArgumentAST({
      oldArg: r.oldVersion,
      newArg: r.newVersion,
      builder: props.builder,
      path: directivePath,
    });
    if (i !== mutual.length - 1) {
      props.builder.write(literal(', '));
    }
  }

  props.builder.write(...(hasArgs ? [keyword(')', lineToWordChange(argsChangeType))] : []));
}

function diffDirectiveUsages(props: {
  oldDirectives: readonly ConstDirectiveNode[];
  newDirectives: readonly ConstDirectiveNode[];
  builder: Builder;
  path: string[];
}) {
  const { added, mutual, removed } = compareDirectiveLists(
    props.oldDirectives,
    props.newDirectives,
  );

  for (const d of removed) {
    diffDirectiveUsage({
      newDirective: null,
      oldDirective: d,
      builder: props.builder,
      path: props.path,
    });
  }

  for (const d of added) {
    diffDirectiveUsage({
      newDirective: d,
      oldDirective: null,
      builder: props.builder,
      path: props.path,
    });
  }

  for (const d of mutual) {
    diffDirectiveUsage({
      newDirective: d.newVersion,
      oldDirective: d.oldVersion,
      builder: props.builder,
      path: props.path,
    });
  }
}

function diffDefaultValue({
  oldArg,
  newArg,
  builder,
}: {
  oldArg: GraphQLArgument | null;
  newArg: GraphQLArgument | null;
  builder: Builder;
}) {
  const oldDefault = oldArg && printDefault(oldArg);
  const newDefault = newArg && printDefault(newArg);

  if (oldDefault === newDefault && newDefault) {
    builder.write(keyword('='), SPACE, typeName(newDefault));
    return;
  }

  if (oldDefault) {
    builder.write(keyword('=', 'removal'), SPACE, typeName(oldDefault, 'removal'));
  }
  if (newDefault) {
    builder.write(keyword('=', 'addition'), SPACE, typeName(newDefault, 'addition'));
  }
}

function diffReturnType(
  props:
    | {
        oldType: GraphQLInputType | GraphQLOutputType;
        newType: GraphQLInputType | GraphQLOutputType | null | undefined;
        builder: Builder;
      }
    | {
        oldType: GraphQLInputType | GraphQLOutputType | null | undefined;
        newType: GraphQLInputType | GraphQLOutputType;
        builder: Builder;
      }
    | {
        oldType: GraphQLInputType | GraphQLOutputType;
        newType: GraphQLInputType | GraphQLOutputType;
        builder: Builder;
      },
) {
  const oldStr = props.oldType?.toString();
  const newStr = props.newType?.toString();
  if (newStr && oldStr === newStr) {
    props.builder.write(typeName(newStr));
    return;
  }

  if (oldStr) {
    props.builder.write(typeName(oldStr, 'removal'));
  }
  if (newStr) {
    props.builder.write(typeName(newStr, 'addition'));
  }
}

function diffArguments(props: {
  parentPath: string[];
  oldArgs: readonly GraphQLArgument[];
  newArgs: readonly GraphQLArgument[];
  indent: number;
  builder: Builder;
}) {
  const { added, mutual, removed } = compareLists(props.oldArgs, props.newArgs);
  for (const a of removed) {
    diffDescription({
      newNode: null,
      oldNode: a,
      indent: props.indent,
      builder: props.builder,
    });
    props.builder.newLine({
      type: 'removal',
      indent: props.indent,
    });
    props.builder.write(
      field(a.name, [...props.parentPath, a.name].join('.'), 'removal'),
      literal(':'),
      SPACE,
    );
    diffReturnType({
      oldType: a.type,
      newType: null,
      builder: props.builder,
    });
    diffDefaultValue({
      oldArg: a,
      newArg: null,
      builder: props.builder,
    });
    diffDirectiveUsages({
      newDirectives: [],
      oldDirectives: a.astNode?.directives ?? [],
      builder: props.builder,
      path: [...props.parentPath, a.name],
    });
  }

  for (const a of added) {
    diffDescription({
      newNode: a,
      oldNode: null,
      indent: props.indent,
      builder: props.builder,
    });
    props.builder.newLine({
      type: 'addition',
      indent: props.indent,
    });
    props.builder.write(
      field(a.name, [...props.parentPath, a.name].join('.'), 'addition'),
      literal(':'),
      SPACE,
    );
    diffReturnType({
      oldType: null,
      newType: a.type,
      builder: props.builder,
    });
    diffDefaultValue({
      oldArg: null,
      newArg: a,
      builder: props.builder,
    });
    diffDirectiveUsages({
      newDirectives: a.astNode?.directives ?? [],
      oldDirectives: [],
      builder: props.builder,
      path: [...props.parentPath, a.name],
    });
  }

  for (const a of mutual) {
    diffDescription({
      newNode: a.newVersion,
      oldNode: a.oldVersion,
      indent: props.indent,
      builder: props.builder,
    });
    props.builder.newLine({
      type: 'mutual',
      indent: props.indent,
    });
    props.builder.write(
      field(a.newVersion.name, [...props.parentPath, a.newVersion.name].join('.')),
      literal(':'),
      SPACE,
    );
    diffReturnType({
      oldType: a.oldVersion.type,
      newType: a.newVersion.type,
      builder: props.builder,
    });
    diffDefaultValue({
      oldArg: a.oldVersion,
      newArg: a.newVersion,
      builder: props.builder,
    });
    diffDirectiveUsages({
      newDirectives: a.newVersion.astNode?.directives ?? [],
      oldDirectives: a.oldVersion.astNode?.directives ?? [],
      builder: props.builder,
      path: [...props.parentPath, a.newVersion.name],
    });
  }
}

export function diffDescription(
  props:
    | {
        oldNode: { description: string | null | undefined } | null;
        newNode: { description: string | null | undefined };
        indent?: number;
        builder: Builder;
      }
    | {
        oldNode: { description: string | null | undefined };
        newNode: { description: string | null | undefined } | null;
        indent?: number;
        builder: Builder;
      },
) {
  const oldDesc = props.oldNode?.description;
  const newDesc = props.newNode?.description;
  if (oldDesc !== newDesc) {
    // @todo diff descriptions instead of showing full removal and addition.
    if (oldDesc) {
      _description({
        content: printDescription(props.oldNode!)!,
        indent: props.indent ?? 0,
        builder: props.builder,
        type: 'removal',
      });
    }
    if (newDesc) {
      _description({
        content: printDescription(props.newNode!)!,
        indent: props.indent ?? 0,
        builder: props.builder,
        type: 'addition',
      });
    }
  } else if (newDesc) {
    _description({
      content: printDescription(props.newNode!)!,
      indent: props.indent ?? 0,
      builder: props.builder,
      type: 'mutual',
    });
  }
}

function _description(props: {
  content: string;
  indent: number;
  type: 'removal' | 'addition' | 'mutual';
  builder: Builder;
}) {
  const lines = props.content.split('\n');
  for (const line of lines) {
    props.builder.newLine({ type: props.type, indent: props.indent });
    props.builder.write(description(line, lineToWordChange(props.type)));
  }
}

function printDescription(def: { readonly description: string | undefined | null }): string | null {
  const { description } = def;
  if (description == null) {
    return null;
  }

  const blockString = print({
    kind: Kind.STRING,
    value: description,
    block: isPrintableAsBlockString(description),
  });

  return blockString;
}
