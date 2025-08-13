import React, { ReactNode } from 'react';
import {
  ConstDirectiveNode,
  DirectiveLocation,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
  Kind,
  print,
} from 'graphql';
import { isPrintableAsBlockString } from 'graphql/language/blockString';
import { cn } from '@/lib/utils';
import { compareLists, diffArrays, matchArrays } from './compare-lists';

type RootFieldsType = {
  query: GraphQLField<any, any>;
  mutation: GraphQLField<any, any>;
  subscription: GraphQLField<any, any>;
};

const TAB = <>&nbsp;&nbsp;</>;

export function ChangeDocument(props: { children: ReactNode; className?: string }) {
  return (
    <table
      aria-label="change-document"
      className={cn('min-w-full whitespace-pre font-mono text-white', props.className)}
      style={{ counterReset: 'olddoc newdoc' }}
    >
      <tbody>{props.children}</tbody>
    </table>
  );
}

export function ChangeRow(props: {
  children: ReactNode;
  className?: string;
  /** Default is mutual */
  type?: 'removal' | 'addition' | 'mutual';
  indent?: boolean;
}) {
  const incrementCounter =
    props.type === 'mutual' || props.type === undefined
      ? 'olddoc newdoc'
      : props.type === 'removal'
        ? 'olddoc'
        : 'newdoc';
  return (
    <tr
      className={cn('bg-gray-900', props.className)}
      style={{ counterIncrement: incrementCounter }}
    >
      <td
        className={cn(
          'schema-doc-row-old w-[42px] min-w-fit select-none p-1 pr-3 text-right text-gray-600',
          props.type === 'addition' && 'invisible',
        )}
      />
      <td
        className={cn(
          'schema-doc-row-new w-[42px] min-w-fit select-none p-1 pr-3 text-right text-gray-600',
          props.type === 'removal' && 'invisible',
        )}
      />
      <td
        className={cn(
          'p-1 pl-2',
          props.type === 'removal' && 'bg-red-700',
          props.type === 'addition' && 'bg-green-800',
        )}
      >
        {props.indent && <>{TAB}</>}
        {props.children}
      </td>
    </tr>
  );
}

function Keyword(props: { term: string }) {
  return <span className="text-gray-400">{props.term}</span>;
}

function Removal(props: {
  children: React.ReactNode | string;
  className?: string;
}): React.ReactNode {
  return <span className={cn('bg-red-700', props.className)}>{props.children}</span>;
}

function Addition(props: { children: React.ReactNode; className?: string }): React.ReactNode {
  return <span className={cn('bg-green-800', props.className)}>{props.children}</span>;
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

function Description(props: {
  content: string;
  type?: 'removal' | 'addition' | 'mutual';
  indent?: boolean;
}): React.ReactNode {
  const lines = props.content.split('\n');

  return (
    <>
      {lines.map((line, index) => (
        <ChangeRow key={index} type={props.type} indent={props.indent}>
          <span
            className={cn(
              props.type === 'addition' || props.type === 'removal'
                ? 'text-gray-900'
                : 'text-gray-500',
            )}
          >
            {line}
          </span>
        </ChangeRow>
      ))}
    </>
  );
}

function FieldName(props: { name: string }): React.ReactNode {
  return <span>{props.name}</span>;
}

function FieldReturnType(props: { returnType: string }): React.ReactNode {
  return <span className="text-orange-400">{props.returnType}</span>;
}

export function DiffDescription(
  props:
    | {
        oldNode: { description: string | null | undefined } | null;
        newNode: { description: string | null | undefined };
        indent?: boolean;
      }
    | {
        oldNode: { description: string | null | undefined };
        newNode: { description: string | null | undefined } | null;
        indent?: boolean;
      },
) {
  const oldDesc = props.oldNode?.description;
  const newDesc = props.newNode?.description;
  if (oldDesc !== newDesc) {
    return (
      <>
        {/*
          To improve this and how only the minimal change,
          do a string diff of the description instead of this simple compare.
        */}
        {oldDesc && (
          <Description
            content={printDescription(props.oldNode!)!}
            indent={props.indent}
            type="removal"
          />
        )}
        {newDesc && (
          <Description
            content={printDescription(props.newNode!)!}
            indent={props.indent}
            type="addition"
          />
        )}
      </>
    );
  }
  if (newDesc) {
    return <Description content={printDescription(props.newNode!)!} indent={props.indent} />;
  }
}

export function DiffField({
  oldField,
  newField,
}:
  | {
      oldField: GraphQLField<any, any, any> | null;
      newField: GraphQLField<any, any, any>;
    }
  | {
      oldField: GraphQLField<any, any, any>;
      newField: GraphQLField<any, any, any> | null;
    }) {
  const oldReturnType = oldField?.type.toString();
  const newReturnType = newField?.type.toString();
  if (!!newField && oldReturnType === newReturnType) {
    return (
      <>
        <DiffDescription newNode={newField} oldNode={oldField} indent />
        <ChangeRow>
          {TAB}
          <FieldName name={newField.name} />
          :&nbsp;
          <FieldReturnType returnType={newField.type.toString()} />
          <DiffDirectiveUsages
            newDirectives={newField?.astNode?.directives ?? []}
            oldDirectives={oldField?.astNode?.directives ?? []}
          />
        </ChangeRow>
      </>
    );
  }
  return (
    <>
      <DiffDescription newNode={newField} oldNode={oldField!} indent />
      <ChangeRow
        type={newField && !oldField ? 'addition' : oldField && !newField ? 'removal' : 'mutual'}
      >
        {TAB}
        <FieldName name={(newField ?? oldField)?.name ?? ''} />
        :&nbsp;
        {oldReturnType && (
          <Removal>
            <FieldReturnType returnType={oldReturnType} />
          </Removal>
        )}
        {newReturnType && (
          <Addition className={cn(oldReturnType && 'ml-2')}>
            <FieldReturnType returnType={newReturnType} />
          </Addition>
        )}
        <DiffDirectiveUsages
          newDirectives={newField?.astNode?.directives ?? []}
          oldDirectives={oldField?.astNode?.directives ?? []}
        />
      </ChangeRow>
    </>
  );
}

export function DirectiveName(props: { name: string }) {
  return <span className="text-gray-200">@{props.name}</span>;
}

export function DiffArguments(props: {
  oldArgs: readonly GraphQLArgument[];
  newArgs: readonly GraphQLArgument[];
}) {
  const { added, mutual, removed } = compareLists(props.oldArgs, props.newArgs);
  return (
    <>
      {removed.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={null} oldNode={a} indent />
          <ChangeRow key={a.name} type="removal" indent>
            <DirectiveArgument arg={a} />
            <DiffDirectiveUsages newDirectives={[]} oldDirectives={a.astNode?.directives ?? []} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {added.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={a} oldNode={null} indent />
          <ChangeRow key={a.name} type="addition" indent>
            <DirectiveArgument arg={a} />
            <DiffDirectiveUsages newDirectives={a.astNode?.directives ?? []} oldDirectives={[]} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {/* @todo This should do a diff on the nested fields... */}
      {mutual.map(a => (
        <React.Fragment key={a.newVersion.name}>
          <DiffDescription newNode={a.newVersion} oldNode={a.oldVersion} indent />
          <ChangeRow key={a.newVersion.name} indent>
            <DirectiveArgument key={a.newVersion.name} arg={a.newVersion} />
            <DiffDirectiveUsages
              newDirectives={a.newVersion.astNode?.directives ?? []}
              oldDirectives={a.oldVersion.astNode?.directives ?? []}
            />
          </ChangeRow>
        </React.Fragment>
      ))}
    </>
  );
}

function determineChangeType<T>(oldType: T | null, newType: T | null) {
  if (oldType && !newType) {
    return 'removal' as const;
  }
  if (newType && !oldType) {
    return 'addition' as const;
  }
  return 'mutual' as const;
}

export function DiffLocations(props: {
  newLocations: readonly DirectiveLocation[];
  oldLocations: readonly DirectiveLocation[];
}) {
  const locations = {
    added: diffArrays(props.newLocations, props.oldLocations),
    removed: diffArrays(props.oldLocations, props.newLocations),
    mutual: matchArrays(props.oldLocations, props.newLocations),
  };

  const locationElements = [
    ...locations.removed.map(r => (
      <Removal>
        <FieldReturnType returnType={r.toString()} />
      </Removal>
    )),
    ...locations.added.map(r => (
      <Addition>
        <FieldReturnType returnType={r.toString()} />
      </Addition>
    )),
    ...locations.mutual.map(r => <FieldReturnType returnType={r.toString()} />),
  ];

  return (
    <>
      <Keyword term="on" />
      &nbsp;
      {locationElements.map((e, index) => (
        <span key={index}>
          {e}
          {index !== locationElements.length - 1 && <>,&nbsp</>}
        </span>
      ))}
    </>
  );
}

export function DiffDirective(
  props:
    | {
        oldDirective: GraphQLDirective | null;
        newDirective: GraphQLDirective;
      }
    | {
        oldDirective: GraphQLDirective;
        newDirective: GraphQLDirective | null;
      },
) {
  const changeType = determineChangeType(props.oldDirective, props.newDirective);
  const hasArgs = props.oldDirective?.args.length || props.newDirective?.args.length;
  return (
    <>
      <DiffDescription newNode={props.newDirective!} oldNode={props.oldDirective!} />
      <ChangeRow type={changeType}>
        <Keyword term="directive" />
        &nbsp;
        <DirectiveName name={props.newDirective?.name ?? props.oldDirective?.name ?? ''} />
        {!!hasArgs && <>(</>}
        {!hasArgs && (
          <>
            &nbsp;
            <DiffLocations
              oldLocations={props.oldDirective?.locations ?? []}
              newLocations={props.newDirective?.locations ?? []}
            />
          </>
        )}
      </ChangeRow>
      <DiffArguments
        oldArgs={props.oldDirective?.args ?? []}
        newArgs={props.newDirective?.args ?? []}
      />
      {!!hasArgs && (
        <ChangeRow type={changeType}>
          )&nbsp;
          <DiffLocations
            oldLocations={props.oldDirective?.locations ?? []}
            newLocations={props.newDirective?.locations ?? []}
          />
        </ChangeRow>
      )}
    </>
  );
}

export function DirectiveArgument(props: { arg: GraphQLArgument }) {
  return (
    <>
      <FieldName name={props.arg.name} />:{' '}
      <FieldReturnType returnType={props.arg.type.toString()} />
      {props.arg.defaultValue === undefined ? '' : `= ${JSON.stringify(props.arg.defaultValue)}`}
    </>
  );
}

export function SchemaDefinitionDiff({
  oldSchema,
  newSchema,
}: {
  oldSchema: GraphQLSchema;
  newSchema: GraphQLSchema;
}) {
  const defaultNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };
  const oldRoot: RootFieldsType = {
    query: {
      args: [],
      name: 'query',
      type:
        oldSchema.getQueryType() ??
        ({ name: defaultNames.query, toString: () => defaultNames.query } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    mutation: {
      args: [],
      name: 'mutation',
      type:
        oldSchema.getMutationType() ??
        ({
          name: defaultNames.mutation,
          toString: () => defaultNames.mutation,
        } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    subscription: {
      args: [],
      name: 'subscription',
      type:
        oldSchema.getSubscriptionType() ??
        ({
          name: defaultNames.subscription,
          toString: () => defaultNames.subscription,
        } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
  };
  const newRoot: RootFieldsType = {
    query: {
      args: [],
      name: 'query',
      type:
        newSchema.getQueryType() ??
        ({ name: defaultNames.query, toString: () => defaultNames.query } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    mutation: {
      args: [],
      name: 'mutation',
      type:
        newSchema.getMutationType() ??
        ({
          name: defaultNames.mutation,
          toString: () => defaultNames.mutation,
        } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    subscription: {
      args: [],
      name: 'subscription',
      type:
        newSchema.getSubscriptionType() ??
        ({
          name: defaultNames.subscription,
          toString: () => defaultNames.subscription,
        } as GraphQLOutputType),
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
  };

  return (
    <>
      <ChangeRow>
        <Keyword term="schema" />
        {' {'}
      </ChangeRow>
      <DiffField oldField={oldRoot.query} newField={newRoot.query} />
      <DiffField oldField={oldRoot.mutation} newField={newRoot.mutation} />
      <DiffField oldField={oldRoot.subscription} newField={newRoot.subscription} />
      <ChangeRow>{'}'}</ChangeRow>
    </>
  );
}

/** For any named type */
export function DiffType({
  oldType,
  newType,
}:
  | {
      oldType: GraphQLNamedType;
      newType: GraphQLNamedType | null;
    }
  | {
      oldType: GraphQLNamedType | null;
      newType: GraphQLNamedType;
    }) {
  if ((isEnumType(oldType) || oldType === null) && (isEnumType(newType) || newType === null)) {
    return <DiffEnum oldEnum={oldType} newEnum={newType} />;
  }
  if ((isUnionType(oldType) || oldType === null) && (isUnionType(newType) || newType === null)) {
    // changesInUnion(oldType, newType, addChange);
  }
  if (
    (isInputObjectType(oldType) || oldType === null) &&
    (isInputObjectType(newType) || newType === null)
  ) {
    // changesInInputObject(oldType, newType, addChange);
  }
  if ((isObjectType(oldType) || oldType === null) && (isObjectType(newType) || newType === null)) {
    return <DiffObject oldObject={oldType!} newObject={newType!} />;
  }
  if (
    (isInterfaceType(oldType) || oldType === null) &&
    (isInterfaceType(newType) || newType === null)
  ) {
    return <DiffObject oldObject={oldType!} newObject={newType!} />;
  }
  if ((isScalarType(oldType) || oldType === null) && (isScalarType(newType) || newType === null)) {
    return <DiffScalar oldScalar={oldType!} newScalar={newType!} />;
  }
}

export function TypeName({ name }: { name: string }) {
  return <span className="text-orange-400">{name}</span>;
}

export function DiffObject({
  oldObject,
  newObject,
}:
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType | null;
      newObject: GraphQLObjectType | GraphQLInterfaceType;
    }
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType;
      newObject: GraphQLObjectType | GraphQLInterfaceType | null;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldObject?.getFields() ?? {}),
    Object.values(newObject?.getFields() ?? {}),
  );
  return (
    <>
      <DiffDescription newNode={newObject!} oldNode={oldObject!} />
      <ChangeRow>
        <Keyword term="type" />
        &nbsp;
        <TypeName name={oldObject?.name ?? newObject?.name ?? ''} />
        <DiffDirectiveUsages
          newDirectives={newObject?.astNode?.directives ?? []}
          oldDirectives={oldObject?.astNode?.directives ?? []}
        />
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffField key={a.name} oldField={a} newField={null} />
      ))}
      {added.map(a => (
        <DiffField key={a.name} oldField={null} newField={a} />
      ))}
      {mutual.map(a => (
        <DiffField key={a.newVersion.name} oldField={a.oldVersion} newField={a.newVersion} />
      ))}
      <ChangeRow>{'}'}</ChangeRow>
    </>
  );
}

export function DiffEnum({
  oldEnum,
  newEnum,
}: {
  oldEnum: GraphQLEnumType | null;
  newEnum: GraphQLEnumType | null;
}) {
  const { added, mutual, removed } = compareLists(
    oldEnum?.getValues() ?? [],
    newEnum?.getValues() ?? [],
  );

  const enumChangeType = determineChangeType(oldEnum, newEnum);

  return (
    <>
      <ChangeRow type={enumChangeType}>
        <Keyword term="enum" />
        &nbsp;
        <TypeName name={oldEnum?.name ?? newEnum?.name ?? ''} />
        {' {'}
      </ChangeRow>
      {/* @todo move this into a DiffEnumValue function and handle directives etc. */}
      {removed.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={null} oldNode={a} indent />
          <ChangeRow type="removal" indent>
            <TypeName name={a.name} />
            <DiffDirectiveUsages newDirectives={[]} oldDirectives={a.astNode?.directives ?? []} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {added.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={a} oldNode={null} indent />
          <ChangeRow type="addition" indent>
            <TypeName name={a.name} />
            <DiffDirectiveUsages newDirectives={a.astNode?.directives ?? []} oldDirectives={[]} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {/* @todo This should do a diff on the nested fields... */}
      {mutual.map(a => (
        <React.Fragment key={a.newVersion.name}>
          <DiffDescription newNode={a.newVersion} oldNode={a.oldVersion} indent />
          <ChangeRow indent>
            <TypeName name={a.newVersion.value.name} />
            <DiffDirectiveUsages
              newDirectives={a.newVersion.astNode?.directives ?? []}
              oldDirectives={a.oldVersion.astNode?.directives ?? []}
            />
          </ChangeRow>
        </React.Fragment>
      ))}
      <ChangeRow type={enumChangeType}>{'}'}</ChangeRow>
    </>
  );
}

export function DiffScalar({
  oldScalar,
  newScalar,
}:
  | {
      oldScalar: GraphQLScalarType;
      newScalar: GraphQLScalarType | null;
    }
  | {
      oldScalar: GraphQLScalarType | null;
      newScalar: GraphQLScalarType;
    }) {
  const scalarChangeType = determineChangeType(oldScalar, newScalar);
  if (oldScalar?.name === newScalar?.name) {
    return (
      <>
        <DiffDescription oldNode={oldScalar!} newNode={newScalar!} />
        <ChangeRow>
          <Keyword term="scalar" />
          &nbsp;
          <TypeName name={newScalar?.name ?? ''} />
          <DiffDirectiveUsages
            newDirectives={newScalar?.astNode?.directives ?? []}
            oldDirectives={oldScalar?.astNode?.directives ?? []}
          />
        </ChangeRow>
      </>
    );
  }
  return (
    <ChangeRow type={scalarChangeType}>
      <Keyword term="scalar" />
      &nbsp;
      {oldScalar && (
        <Removal>
          <TypeName name={oldScalar.name} />
        </Removal>
      )}
      {newScalar && (
        <Addition className={cn(oldScalar && 'ml-2')}>
          <TypeName name={newScalar.name} />
        </Addition>
      )}
      <DiffDirectiveUsages
        newDirectives={newScalar?.astNode?.directives ?? []}
        oldDirectives={oldScalar?.astNode?.directives ?? []}
      />
    </ChangeRow>
  );
}

export function DiffDirectiveUsages(props: {
  oldDirectives: readonly ConstDirectiveNode[];
  newDirectives: readonly ConstDirectiveNode[];
}) {
  const { added, mutual, removed } = compareLists(props.oldDirectives, props.newDirectives);

  return (
    <>
      {removed.map(d => (
        <DiffDirectiveUsage key={d.name.value} newDirective={null} oldDirective={d} />
      ))}
      {added.map(d => (
        <DiffDirectiveUsage key={d.name.value} newDirective={d} oldDirective={null} />
      ))}
      {mutual.map(d => (
        <DiffDirectiveUsage
          key={d.newVersion.name.value}
          newDirective={d.newVersion}
          oldDirective={d.oldVersion}
        />
      ))}
    </>
  );
}

export function DiffDirectiveUsage(
  props:
    | {
        oldDirective: ConstDirectiveNode | null;
        newDirective: ConstDirectiveNode;
      }
    | {
        oldDirective: ConstDirectiveNode;
        newDirective: ConstDirectiveNode | null;
      },
) {
  const name = props.newDirective?.name.value ?? props.oldDirective?.name.value ?? '';
  const newArgs = props.newDirective?.arguments ?? [];
  const oldArgs = props.oldDirective?.arguments ?? [];
  const hasArgs = !!(newArgs.length + oldArgs.length);
  const changeType = determineChangeType(props.oldDirective, props.newDirective);
  const Klass =
    changeType === 'addition' ? Addition : changeType === 'removal' ? Removal : React.Fragment;
  const { added, mutual, removed } = compareLists(oldArgs, newArgs);
  return (
    <Klass>
      &nbsp;
      <DirectiveName name={name} />
      {hasArgs && <>(</>}
      {removed.map(_ => '@TODO REMOVED DIRECTIVE ARGS')}
      {added.map(_ => '@TODO ADDED DIRECTIVE ARGS')}
      {mutual.map(_ => '@TODO MUTUAL DIRECTIVE ARGS')}
      {hasArgs && <>)</>}
    </Klass>
  );
  // <DiffArguments
}
