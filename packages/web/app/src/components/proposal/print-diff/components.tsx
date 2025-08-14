/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import React, { ReactNode } from 'react';
import {
  astFromValue,
  ConstArgumentNode,
  ConstDirectiveNode,
  DirectiveLocation,
  GraphQLArgument,
  GraphQLDirective,
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
  GraphQLSchema,
  GraphQLUnionType,
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
      className={cn(
        'min-w-full cursor-default whitespace-pre font-mono text-white',
        props.className,
      )}
      style={{ counterReset: 'olddoc newdoc' }}
    >
      <tbody>{props.children}</tbody>
    </table>
  );
}

export function ChangeSpacing(props: { type?: 'removal' | 'addition' | 'mutual' }) {
  return (
    <tr>
      <td />
      <td />
      <td
        className={cn(
          props.type === 'removal' && 'bg-[#351A19]',
          props.type === 'addition' && 'bg-[#19241E]',
          (props.type === 'mutual' || !props.type) && 'bg-gray-900',
          'h-4',
        )}
      />
    </tr>
  );
}

export function ChangeRow(props: {
  children?: ReactNode;
  className?: string;
  /** Default is mutual */
  type?: 'removal' | 'addition' | 'mutual';
  indent?: boolean | number;
}) {
  const incrementCounter =
    props.type === 'mutual' || props.type === undefined
      ? 'olddoc newdoc'
      : props.type === 'removal'
        ? 'olddoc'
        : 'newdoc';
  return (
    <tr style={{ counterIncrement: incrementCounter }}>
      <td
        className={cn(
          'schema-doc-row-old w-[42px] min-w-fit select-none bg-gray-900 p-1 pr-3 text-right text-gray-600',
          props.className,
          props.type === 'removal' && 'bg-red-900/50',
          props.type === 'addition' && 'invisible',
        )}
      />
      <td
        className={cn(
          'schema-doc-row-new w-[42px] min-w-fit select-none bg-gray-900 p-1 pr-3 text-right text-gray-600',
          props.className,
          props.type === 'removal' && 'invisible',
          props.type === 'addition' && 'bg-green-900/50',
        )}
      />
      <td
        className={cn(
          'bg-gray-900 pl-2',
          props.className,
          props.type === 'removal' && 'bg-[#351A19]',
          props.type === 'addition' && 'bg-[#19241E]',
        )}
      >
        <span
          className={cn(
            'bg-gray-900',
            props.type === 'removal' && 'bg-[#351A19] line-through decoration-[#998c8b]',
            props.type === 'addition' && 'bg-[#19241E]',
          )}
        >
          {props.indent &&
            Array.from({ length: Number(props.indent) }).map((_, i) => (
              <React.Fragment key={i}>{TAB}</React.Fragment>
            ))}
          {props.children}
        </span>
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
  return (
    <span
      className={cn(
        'bg-[#351A19] p-1 line-through decoration-[#998c8b] hover:bg-red-800',
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

function Addition(props: { children: React.ReactNode; className?: string }): React.ReactNode {
  return (
    <span className={cn('bg-[#19241E] p-1 hover:bg-green-900', props.className)}>
      {props.children}
    </span>
  );
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
  indent?: boolean | number;
}): React.ReactNode {
  const lines = props.content.split('\n');

  return (
    <>
      {lines.map((line, index) => (
        <ChangeRow key={index} type={props.type} indent={props.indent}>
          <Change type={props.type}>
            <span className="text-gray-500">{line}</span>
          </Change>
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
        indent?: boolean | number;
      }
    | {
        oldNode: { description: string | null | undefined };
        newNode: { description: string | null | undefined } | null;
        indent?: boolean | number;
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

export function DiffInputField({
  oldField,
  newField,
}:
  | {
      oldField: GraphQLInputField | null;
      newField: GraphQLInputField;
    }
  | {
      oldField: GraphQLInputField;
      newField: GraphQLInputField | null;
    }) {
  const changeType = determineChangeType(oldField, newField);
  return (
    <>
      <DiffDescription newNode={newField!} oldNode={oldField!} indent />
      <ChangeRow type={changeType} indent>
        <Change type={changeType}>
          <FieldName name={newField?.name ?? oldField?.name ?? ''} />
        </Change>
        :&nbsp;
        <DiffReturnType newType={newField?.type!} oldType={oldField?.type!} />
        <DiffDirectiveUsages
          newDirectives={newField?.astNode?.directives ?? []}
          oldDirectives={oldField?.astNode?.directives ?? []}
        />
      </ChangeRow>
    </>
  );
}

function Change({
  type,
  children,
}: {
  children: ReactNode;
  type?: 'addition' | 'removal' | 'mutual';
}): ReactNode {
  const Klass = type === 'addition' ? Addition : type === 'removal' ? Removal : React.Fragment;
  return <Klass>{children}</Klass>;
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
  const changeType = determineChangeType(oldField, newField);
  const AfterArguments = (
    <>
      :&nbsp;
      <DiffReturnType newType={newField?.type!} oldType={oldField?.type!} />
      <DiffDirectiveUsages
        newDirectives={newField?.astNode?.directives ?? []}
        oldDirectives={oldField?.astNode?.directives ?? []}
      />
    </>
  );
  return (
    <>
      <DiffDescription newNode={newField!} oldNode={oldField!} indent />
      <ChangeRow type={changeType} indent>
        <Change type={changeType}>
          <FieldName name={newField?.name ?? oldField?.name ?? ''} />
        </Change>
        {hasArgs && (
          <Change type={argsChangeType}>
            <>(</>
          </Change>
        )}
        {!hasArgs && AfterArguments}
      </ChangeRow>
      <DiffArguments newArgs={newField?.args ?? []} oldArgs={oldField?.args ?? []} indent={2} />
      {!!hasArgs && (
        <ChangeRow type={changeType} indent>
          <Change type={argsChangeType}>
            <>)</>
          </Change>
          {AfterArguments}
        </ChangeRow>
      )}
    </>
  );
}

export function DirectiveName(props: { name: string }) {
  return <span className="text-gray-200">@{props.name}</span>;
}

export function DiffArguments(props: {
  oldArgs: readonly GraphQLArgument[];
  newArgs: readonly GraphQLArgument[];
  indent: boolean | number;
}) {
  const { added, mutual, removed } = compareLists(props.oldArgs, props.newArgs);
  return (
    <>
      {removed.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={null} oldNode={a} indent={props.indent} />
          <ChangeRow type="removal" indent={props.indent}>
            <Change type="removal">
              <FieldName name={a.name} />
            </Change>
            : <DiffReturnType oldType={a.type} newType={null} />
            <DiffDefaultValue oldArg={a} newArg={null} />
            <DiffDirectiveUsages newDirectives={[]} oldDirectives={a.astNode?.directives ?? []} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {added.map(a => (
        <React.Fragment key={a.name}>
          <DiffDescription newNode={a} oldNode={null} indent={props.indent} />
          <ChangeRow type="addition" indent={props.indent}>
            <Change type="addition">
              <FieldName name={a.name} />
            </Change>
            : <DiffReturnType oldType={null} newType={a.type} />
            <DiffDefaultValue oldArg={null} newArg={a} />
            <DiffDirectiveUsages newDirectives={a.astNode?.directives ?? []} oldDirectives={[]} />
          </ChangeRow>
        </React.Fragment>
      ))}
      {mutual.map(a => (
        <React.Fragment key={a.newVersion.name}>
          <DiffDescription newNode={a.newVersion} oldNode={a.oldVersion} indent={props.indent} />
          <ChangeRow indent={props.indent}>
            <Change>
              <FieldName name={a.newVersion.name} />
            </Change>
            : <DiffReturnType oldType={a.oldVersion.type} newType={a.newVersion.type} />
            <DiffDefaultValue oldArg={a.oldVersion} newArg={a.newVersion} />
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
          {index !== locationElements.length - 1 && <>&nbsp;|&nbsp;</>}
        </span>
      ))}
    </>
  );
}

function DiffRepeatable(
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
  const oldRepeatable = !!props.oldDirective?.isRepeatable;
  const newRepeatable = !!props.newDirective?.isRepeatable;
  if (oldRepeatable === newRepeatable) {
    return newRepeatable ? (
      <>
        <Keyword term="repeatable" />
        &nbsp;
      </>
    ) : null;
  }
  return (
    <>
      {oldRepeatable && (
        <Removal>
          <Keyword term="repeatable" />
          &nbsp;
        </Removal>
      )}
      {newRepeatable && (
        <Addition className={oldRepeatable ? 'ml-2' : undefined}>
          <Keyword term="repeatable" />
          &nbsp;
        </Addition>
      )}
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
  const name = props.newDirective?.name ?? props.oldDirective?.name ?? '';
  const changeType = determineChangeType(props.oldDirective, props.newDirective);
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
  const AfterArguments = (
    <>
      &nbsp;
      <DiffRepeatable oldDirective={props.oldDirective!} newDirective={props.newDirective!} />
      <DiffLocations
        oldLocations={props.oldDirective?.locations ?? []}
        newLocations={props.newDirective?.locations ?? []}
      />
    </>
  );
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={props.newDirective!} oldNode={props.oldDirective!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="directive" />
          &nbsp;
          <DirectiveName name={name} />
        </Change>
        {!!hasArgs && (
          <Change type={argsChangeType}>
            <>(</>
          </Change>
        )}
        {!hasArgs && AfterArguments}
      </ChangeRow>
      <DiffArguments
        oldArgs={props.oldDirective?.args ?? []}
        newArgs={props.newDirective?.args ?? []}
        indent
      />
      {!!hasArgs && (
        <ChangeRow type={changeType}>
          <Change type={argsChangeType}>
            <>)</>
          </Change>
          {AfterArguments}
        </ChangeRow>
      )}
    </>
  );
}

function DiffReturnType(
  props:
    | {
        oldType: GraphQLInputType | GraphQLOutputType;
        newType: GraphQLInputType | GraphQLOutputType | null | undefined;
      }
    | {
        oldType: GraphQLInputType | GraphQLOutputType | null | undefined;
        newType: GraphQLInputType | GraphQLOutputType;
      }
    | {
        oldType: GraphQLInputType | GraphQLOutputType;
        newType: GraphQLInputType | GraphQLOutputType;
      },
) {
  const oldStr = props.oldType?.toString();
  const newStr = props.newType?.toString();
  if (newStr && oldStr === newStr) {
    return <FieldReturnType returnType={newStr} />;
  }

  return (
    <>
      {oldStr && (
        <Removal>
          <FieldReturnType returnType={oldStr} />
        </Removal>
      )}
      {newStr && (
        <Addition className={oldStr && 'ml-2'}>
          <FieldReturnType returnType={newStr} />
        </Addition>
      )}
    </>
  );
}

function printDefault(arg: GraphQLArgument) {
  const defaultAST = astFromValue(arg.defaultValue, arg.type);
  return defaultAST && print(defaultAST);
}

function DiffDefaultValue({
  oldArg,
  newArg,
}: {
  oldArg: GraphQLArgument | null;
  newArg: GraphQLArgument | null;
}) {
  const oldDefault = oldArg && printDefault(oldArg);
  const newDefault = newArg && printDefault(newArg);

  if (oldDefault === newDefault) {
    return newDefault ? <> = {newDefault}</> : null;
  }
  return (
    <>
      {oldDefault && <Removal> = {oldDefault}</Removal>}
      {newDefault && (
        <Addition className={oldDefault ? 'ml-2' : undefined}> = {newDefault}</Addition>
      )}
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
    return <DiffUnion oldUnion={oldType} newUnion={newType} />;
  }
  if (
    (isInputObjectType(oldType) || oldType === null) &&
    (isInputObjectType(newType) || newType === null)
  ) {
    return <DiffInputObject oldInput={oldType!} newInput={newType!} />;
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

function TypeName({ name }: { name: string }) {
  return <span className="text-orange-400">{name}</span>;
}

export function DiffInputObject({
  oldInput,
  newInput,
}:
  | {
      oldInput: GraphQLInputObjectType | null;
      newInput: GraphQLInputObjectType;
    }
  | {
      oldInput: GraphQLInputObjectType;
      newInput: GraphQLInputObjectType | null;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldInput?.getFields() ?? {}),
    Object.values(newInput?.getFields() ?? {}),
  );
  const changeType = determineChangeType(oldInput, newInput);
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newInput!} oldNode={oldInput!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="input" />
          &nbsp;
          <TypeName name={oldInput?.name ?? newInput?.name ?? ''} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newInput?.astNode?.directives ?? []}
          oldDirectives={oldInput?.astNode?.directives ?? []}
        />
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffInputField key={a.name} oldField={a} newField={null} />
      ))}
      {added.map(a => (
        <DiffInputField key={a.name} oldField={null} newField={a} />
      ))}
      {mutual.map(a => (
        <DiffInputField key={a.newVersion.name} oldField={a.oldVersion} newField={a.newVersion} />
      ))}
      <ChangeRow type={changeType}>{'}'}</ChangeRow>
    </>
  );
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
  const changeType = determineChangeType(oldObject, newObject);
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newObject!} oldNode={oldObject!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="type" />
          &nbsp;
          <TypeName name={oldObject?.name ?? newObject?.name ?? ''} />
        </Change>
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
      <ChangeRow type={changeType}>{'}'}</ChangeRow>
    </>
  );
}

export function DiffEnumValue({
  oldValue,
  newValue,
}: {
  oldValue: GraphQLEnumValue | null;
  newValue: GraphQLEnumValue | null;
}) {
  const changeType = determineChangeType(oldValue, newValue);
  const name = oldValue?.name ?? newValue?.name ?? '';
  return (
    <>
      <DiffDescription newNode={newValue!} oldNode={oldValue!} indent />
      <ChangeRow type={changeType} indent>
        <Change type={changeType}>
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newValue?.astNode?.directives ?? []}
          oldDirectives={oldValue?.astNode?.directives ?? []}
        />
      </ChangeRow>
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

  const changeType = determineChangeType(oldEnum, newEnum);

  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newEnum!} oldNode={oldEnum!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="enum" />
          &nbsp;
          <TypeName name={oldEnum?.name ?? newEnum?.name ?? ''} />
        </Change>
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffEnumValue key={a.name} newValue={null} oldValue={a} />
      ))}
      {added.map(a => (
        <DiffEnumValue key={a.name} newValue={a} oldValue={null} />
      ))}
      {mutual.map(a => (
        <DiffEnumValue key={a.newVersion.name} newValue={a.newVersion} oldValue={a.oldVersion} />
      ))}
      <ChangeRow type={changeType}>{'}'}</ChangeRow>
    </>
  );
}

export function DiffUnion({
  oldUnion,
  newUnion,
}: {
  oldUnion: GraphQLUnionType | null;
  newUnion: GraphQLUnionType | null;
}) {
  const { added, mutual, removed } = compareLists(
    oldUnion?.getTypes() ?? [],
    newUnion?.getTypes() ?? [],
  );

  const changeType = determineChangeType(oldUnion, newUnion);
  const name = oldUnion?.name ?? newUnion?.name ?? '';
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newUnion!} oldNode={oldUnion!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="union" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newUnion?.astNode?.directives ?? []}
          oldDirectives={oldUnion?.astNode?.directives ?? []}
        />
        {' = '}
      </ChangeRow>
      {removed.map(a => (
        <React.Fragment key={a.name}>
          <ChangeRow type="removal" indent>
            <Change type="removal">
              | <TypeName name={a.name} />
            </Change>
          </ChangeRow>
        </React.Fragment>
      ))}
      {added.map(a => (
        <React.Fragment key={a.name}>
          <ChangeRow type="addition" indent>
            <Change type="addition">
              | <TypeName name={a.name} />
            </Change>
          </ChangeRow>
        </React.Fragment>
      ))}
      {mutual.map(a => (
        <React.Fragment key={a.newVersion.name}>
          <ChangeRow indent>
            <Change>
              | <TypeName name={a.newVersion.name} />
            </Change>
          </ChangeRow>
        </React.Fragment>
      ))}
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
  const changeType = determineChangeType(oldScalar, newScalar);
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription oldNode={oldScalar!} newNode={newScalar!} />
      <ChangeRow type={changeType}>
        <Change type={changeType}>
          <Keyword term="scalar" />
          &nbsp;
          <TypeName name={newScalar?.name ?? ''} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newScalar?.astNode?.directives ?? []}
          oldDirectives={oldScalar?.astNode?.directives ?? []}
        />
      </ChangeRow>
    </>
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
  const argumentElements = [
    ...removed.map(r => (
      <Change type="removal">
        <DiffArgumentAST oldArg={r} newArg={null} />
      </Change>
    )),
    ...added.map(r => (
      <Change type="addition">
        <DiffArgumentAST oldArg={null} newArg={r} />
      </Change>
    )),
    ...mutual.map(r => (
      <Change>
        <DiffArgumentAST oldArg={r.oldVersion} newArg={r.newVersion} />
      </Change>
    )),
  ];

  return (
    <Change type={changeType}>
      &nbsp;
      <DirectiveName name={name} />
      {hasArgs && (
        <Change type={argsChangeType}>
          <>(</>
        </Change>
      )}
      {argumentElements.map((e, index) => (
        <React.Fragment key={index}>
          {e}
          {index === argumentElements.length - 1 ? '' : ', '}
        </React.Fragment>
      ))}
      {hasArgs && (
        <Change type={argsChangeType}>
          <>)</>
        </Change>
      )}
    </Change>
  );
}

export function DiffArgumentAST({
  oldArg,
  newArg,
}: {
  oldArg: ConstArgumentNode | null;
  newArg: ConstArgumentNode | null;
}) {
  const name = oldArg?.name.value ?? newArg?.name.value ?? '';
  const oldType = oldArg && print(oldArg.value);
  const newType = newArg && print(newArg.value);

  const DiffType = ({
    oldType,
    newType,
  }: {
    oldType: string | null;
    newType: string | null;
  }): ReactNode => {
    if (oldType === newType) {
      return newType;
    }
    return (
      <>
        {oldType && <Removal>{oldType}</Removal>}
        {newType && <Addition>{newType}</Addition>}
      </>
    );
  };

  return (
    <>
      <FieldName name={name} />
      :&nbsp;
      <DiffType oldType={oldType} newType={newType} />
    </>
  );
}
