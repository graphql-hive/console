/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { createContext, Fragment, ReactElement, ReactNode, useContext, useState } from 'react';
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
import { CheckIcon, XIcon } from '@/components/ui/icon';
import { SeverityLevelType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { compareLists, diffArrays, matchArrays } from './compare-lists';

type RootFieldsType = {
  query: GraphQLField<any, any>;
  mutation: GraphQLField<any, any>;
  subscription: GraphQLField<any, any>;
};

const TAB = <>&nbsp;&nbsp;</>;

export const AnnotatedContext = createContext({
  annotatedCoordinates: null,
} as Readonly<{
  /**
   * As annotations are rendered, this tracks coordinates used. This is used internally to
   * show annotations that are not resolved but that are not tied to a coordinate that exists anymore.
   *
   * Note that adding a value to this Set does not trigger a rerender.
   * Special care must be taken to ensure the render order is correct
   */
  annotatedCoordinates: Set<string> | null;
}>);

export function AnnotatedProvider(props: { children: ReactNode }) {
  const [context] = useState({ annotatedCoordinates: new Set<string>() });
  return <AnnotatedContext.Provider value={context}>{props.children}</AnnotatedContext.Provider>;
}

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
  severityLevel?: SeverityLevelType;
  indent?: boolean | number;
  coordinate?: string;
  annotations?: (coordinate: string) => ReactElement | null;
}) {
  const ctx = useContext(AnnotatedContext);
  const incrementCounter =
    props.type === 'mutual' || props.type === undefined
      ? 'olddoc newdoc'
      : props.type === 'removal'
        ? 'olddoc'
        : 'newdoc';
  const annotation = !!props.coordinate && props.annotations?.(props.coordinate);

  if (!!annotation) {
    ctx.annotatedCoordinates?.add(props.coordinate!);
  }

  return (
    <>
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
                <Fragment key={i}>{TAB}</Fragment>
              ))}
            {props.severityLevel === SeverityLevelType.Breaking && (
              <span title="Breaking Change">
                <XIcon className="inline-block text-red-600" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Dangerous && (
              <span title="Dangerous Change">
                <ExclamationTriangleIcon className="mr-1 inline-block text-yellow-600" />
              </span>
            )}
            {props.severityLevel === SeverityLevelType.Safe && (
              <span title="Safe Change">
                <CheckIcon className="mr-1 inline-block text-green-600" />
              </span>
            )}
            {props.children}
          </span>
        </td>
      </tr>
      {annotation && (
        <tr>
          <td colSpan={3}>{annotation}</td>
        </tr>
      )}
    </>
  );
}

function Keyword(props: { term: string }) {
  return <span className="text-gray-400">{props.term}</span>;
}

function Removal(props: { children: ReactNode | string; className?: string }): ReactNode {
  return (
    <span
      className={cn(
        'bg-[#351A19] p-1 -m-1 line-through decoration-[#998c8b] hover:bg-red-800',
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

function Addition(props: { children: ReactNode; className?: string }): ReactNode {
  return (
    <span className={cn('bg-[#19241E] p-1 -m-1 hover:bg-green-900', props.className)}>
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
  annotations: (coordinat: string) => ReactElement | null;
}): ReactNode {
  const lines = props.content.split('\n');

  return (
    <>
      {lines.map((line, index) => (
        <ChangeRow
          key={index}
          type={props.type}
          indent={props.indent}
          annotations={props.annotations}
        >
          <Change type={props.type}>
            <span className="text-gray-500">{line}</span>
          </Change>
        </ChangeRow>
      ))}
    </>
  );
}

function FieldName(props: { name: string }): ReactNode {
  return <span>{props.name}</span>;
}

function FieldReturnType(props: { returnType: string }): ReactNode {
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
  parentPath,
  oldField,
  newField,
  annotations,
}:
  | {
      parentPath: string[];
      oldField: GraphQLInputField | null;
      newField: GraphQLInputField;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      parentPath: string[];
      oldField: GraphQLInputField;
      newField: GraphQLInputField | null;
      annotations: (coordinat: string) => ReactElement | null;
    }) {
  const changeType = determineChangeType(oldField, newField);
  const name = newField?.name ?? oldField?.name ?? '';
  const path = [...parentPath, name];
  // @todo consider allowing comments on nested coordinates.
  // const directiveCoordinates = [...newField?.astNode?.directives ?? [], ...oldField?.astNode?.directives ?? []].map(d => {
  //   return [...path, `@${d.name.value}`].join('.')
  // });
  return (
    <>
      <DiffDescription newNode={newField!} oldNode={oldField!} indent />
      <ChangeRow type={changeType} indent coordinate={path.join('.')} annotations={annotations}>
        <Change type={changeType}>
          <FieldName name={name} />
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
  const Klass = type === 'addition' ? Addition : type === 'removal' ? Removal : Fragment;
  return <Klass>{children}</Klass>;
}

export function DiffField({
  parentPath,
  oldField,
  newField,
  annotations,
}:
  | {
      parentPath: string[];
      oldField: GraphQLField<any, any, any> | null;
      newField: GraphQLField<any, any, any>;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      parentPath: string[];
      oldField: GraphQLField<any, any, any>;
      newField: GraphQLField<any, any, any> | null;
      annotations: (coordinat: string) => ReactElement | null;
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
  const path = [...parentPath, name];
  return (
    <>
      <DiffDescription newNode={newField!} oldNode={oldField!} indent />
      <ChangeRow type={changeType} indent coordinate={path.join('.')} annotations={annotations}>
        <Change type={changeType}>
          <FieldName name={name} />
        </Change>
        {hasArgs && (
          <Change type={argsChangeType}>
            <>(</>
          </Change>
        )}
        {!hasArgs && AfterArguments}
      </ChangeRow>
      <DiffArguments
        newArgs={newField?.args ?? []}
        oldArgs={oldField?.args ?? []}
        indent={2}
        parentPath={path}
        annotations={annotations}
      />
      {!!hasArgs && (
        <ChangeRow type={changeType} indent annotations={annotations}>
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
  parentPath: string[];
  oldArgs: readonly GraphQLArgument[];
  newArgs: readonly GraphQLArgument[];
  indent: boolean | number;
  annotations: (coordinat: string) => ReactElement | null;
}) {
  const { added, mutual, removed } = compareLists(props.oldArgs, props.newArgs);
  return (
    <>
      {removed.map(a => (
        <Fragment key={a.name}>
          <DiffDescription newNode={null} oldNode={a} indent={props.indent} />
          <ChangeRow
            type="removal"
            indent={props.indent}
            coordinate={[...props.parentPath, a.name].join('.')}
            annotations={props.annotations}
          >
            <Change type="removal">
              <FieldName name={a.name} />
            </Change>
            : <DiffReturnType oldType={a.type} newType={null} />
            <DiffDefaultValue oldArg={a} newArg={null} />
            <DiffDirectiveUsages newDirectives={[]} oldDirectives={a.astNode?.directives ?? []} />
          </ChangeRow>
        </Fragment>
      ))}
      {added.map(a => (
        <Fragment key={a.name}>
          <DiffDescription newNode={a} oldNode={null} indent={props.indent} />
          <ChangeRow
            type="addition"
            indent={props.indent}
            coordinate={[...props.parentPath, a.name].join('.')}
            annotations={props.annotations}
          >
            <Change type="addition">
              <FieldName name={a.name} />
            </Change>
            : <DiffReturnType oldType={null} newType={a.type} />
            <DiffDefaultValue oldArg={null} newArg={a} />
            <DiffDirectiveUsages newDirectives={a.astNode?.directives ?? []} oldDirectives={[]} />
          </ChangeRow>
        </Fragment>
      ))}
      {mutual.map(a => (
        <Fragment key={a.newVersion.name}>
          <DiffDescription newNode={a.newVersion} oldNode={a.oldVersion} indent={props.indent} />
          <ChangeRow
            indent={props.indent}
            coordinate={[...props.parentPath, a.newVersion.name].join('.')}
            annotations={props.annotations}
          >
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
        </Fragment>
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
      <Removal key={`removed-${r.toString()}`}>
        <FieldReturnType returnType={r.toString()} />
      </Removal>
    )),
    ...locations.added.map(r => (
      <Addition key={`added-${r.toString()}`}>
        <FieldReturnType returnType={r.toString()} />
      </Addition>
    )),
    ...locations.mutual.map(r => <FieldReturnType key={r.toString()} returnType={r.toString()} />),
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
        annotations: (coordinat: string) => ReactElement | null;
      }
    | {
        oldDirective: GraphQLDirective;
        newDirective: GraphQLDirective | null;
        annotations: (coordinat: string) => ReactElement | null;
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
  const path = [`@${name}`];
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={props.newDirective!} oldNode={props.oldDirective!} />
      <ChangeRow type={changeType} coordinate={path.join('.')} annotations={props.annotations}>
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
        parentPath={path}
        annotations={props.annotations}
      />
      {!!hasArgs && (
        <ChangeRow type={changeType} annotations={props.annotations}>
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
  annotations,
}: {
  oldSchema: GraphQLSchema | undefined | null;
  newSchema: GraphQLSchema | undefined | null;
  annotations: (coordinat: string) => ReactElement | null;
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
  // @todo verify using this as the path is correct.
  const path = [''];
  const changeType = determineChangeType(oldSchema, newSchema);

  return (
    <>
      <ChangeSpacing type={changeType} />
      <ChangeRow coordinate={path.join('.')} annotations={annotations}>
        <Keyword term="schema" />
        {' {'}
      </ChangeRow>
      <DiffField
        oldField={oldRoot.query}
        newField={newRoot.query}
        parentPath={path}
        annotations={annotations}
      />
      <DiffField
        oldField={oldRoot.mutation}
        newField={newRoot.mutation}
        parentPath={path}
        annotations={annotations}
      />
      <DiffField
        oldField={oldRoot.subscription}
        newField={newRoot.subscription}
        parentPath={path}
        annotations={annotations}
      />
      <ChangeRow>{'}'}</ChangeRow>
    </>
  );
}

/** For any named type */
export function DiffType({
  oldType,
  newType,
  annotations,
}:
  | {
      oldType: GraphQLNamedType;
      newType: GraphQLNamedType | null;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      oldType: GraphQLNamedType | null;
      newType: GraphQLNamedType;
      annotations: (coordinat: string) => ReactElement | null;
    }) {
  if ((isEnumType(oldType) || oldType === null) && (isEnumType(newType) || newType === null)) {
    return <DiffEnum oldEnum={oldType} newEnum={newType} annotations={annotations} />;
  }
  if ((isUnionType(oldType) || oldType === null) && (isUnionType(newType) || newType === null)) {
    return <DiffUnion oldUnion={oldType} newUnion={newType} annotations={annotations} />;
  }
  if (
    (isInputObjectType(oldType) || oldType === null) &&
    (isInputObjectType(newType) || newType === null)
  ) {
    return <DiffInputObject oldInput={oldType!} newInput={newType!} annotations={annotations} />;
  }
  if ((isObjectType(oldType) || oldType === null) && (isObjectType(newType) || newType === null)) {
    return <DiffObject oldObject={oldType!} newObject={newType!} annotations={annotations} />;
  }
  if (
    (isInterfaceType(oldType) || oldType === null) &&
    (isInterfaceType(newType) || newType === null)
  ) {
    return <DiffObject oldObject={oldType!} newObject={newType!} annotations={annotations} />;
  }
  if ((isScalarType(oldType) || oldType === null) && (isScalarType(newType) || newType === null)) {
    return <DiffScalar oldScalar={oldType!} newScalar={newType!} annotations={annotations} />;
  }
}

function TypeName({ name }: { name: string }) {
  return <span className="text-orange-400">{name}</span>;
}

export function DiffInputObject({
  oldInput,
  newInput,
  annotations,
}:
  | {
      oldInput: GraphQLInputObjectType | null;
      newInput: GraphQLInputObjectType;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      oldInput: GraphQLInputObjectType;
      newInput: GraphQLInputObjectType | null;
      annotations: (coordinat: string) => ReactElement | null;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldInput?.getFields() ?? {}),
    Object.values(newInput?.getFields() ?? {}),
  );
  const changeType = determineChangeType(oldInput, newInput);
  const name = oldInput?.name ?? newInput?.name ?? '';
  const path = [name];
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newInput!} oldNode={oldInput!} />
      <ChangeRow type={changeType} coordinate={path.join('.')} annotations={annotations}>
        <Change type={changeType}>
          <Keyword term="input" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newInput?.astNode?.directives ?? []}
          oldDirectives={oldInput?.astNode?.directives ?? []}
        />
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffInputField
          key={a.name}
          oldField={a}
          newField={null}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      {added.map(a => (
        <DiffInputField
          key={a.name}
          oldField={null}
          newField={a}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      {mutual.map(a => (
        <DiffInputField
          key={a.newVersion.name}
          oldField={a.oldVersion}
          newField={a.newVersion}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      <ChangeRow type={changeType} annotations={annotations}>
        {'}'}
      </ChangeRow>
    </>
  );
}

export function DiffObject({
  oldObject,
  newObject,
  annotations,
}:
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType | null;
      newObject: GraphQLObjectType | GraphQLInterfaceType;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      oldObject: GraphQLObjectType | GraphQLInterfaceType;
      newObject: GraphQLObjectType | GraphQLInterfaceType | null;
      annotations: (coordinat: string) => ReactElement | null;
    }) {
  const { added, mutual, removed } = compareLists(
    Object.values(oldObject?.getFields() ?? {}),
    Object.values(newObject?.getFields() ?? {}),
  );
  const name = oldObject?.name ?? newObject?.name ?? '';
  const changeType = determineChangeType(oldObject, newObject);
  const path = [name];
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newObject!} oldNode={oldObject!} />
      <ChangeRow type={changeType} coordinate={path.join('.')} annotations={annotations}>
        <Change type={changeType}>
          <Keyword term="type" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newObject?.astNode?.directives ?? []}
          oldDirectives={oldObject?.astNode?.directives ?? []}
        />
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffField
          key={a.name}
          oldField={a}
          newField={null}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      {added.map(a => (
        <DiffField
          key={a.name}
          oldField={null}
          newField={a}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      {mutual.map(a => (
        <DiffField
          key={a.newVersion.name}
          oldField={a.oldVersion}
          newField={a.newVersion}
          parentPath={path}
          annotations={annotations}
        />
      ))}
      <ChangeRow type={changeType} annotations={annotations}>
        {'}'}
      </ChangeRow>
    </>
  );
}

export function DiffEnumValue({
  parentPath,
  oldValue,
  newValue,
  annotations,
}: {
  parentPath: string[];
  oldValue: GraphQLEnumValue | null;
  newValue: GraphQLEnumValue | null;
  annotations: (coordinat: string) => ReactElement | null;
}) {
  const changeType = determineChangeType(oldValue, newValue);
  const name = oldValue?.name ?? newValue?.name ?? '';
  return (
    <>
      <DiffDescription newNode={newValue!} oldNode={oldValue!} indent />
      <ChangeRow
        type={changeType}
        indent
        coordinate={[...parentPath, name].join('.')}
        annotations={annotations}
      >
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
  annotations,
}: {
  oldEnum: GraphQLEnumType | null;
  newEnum: GraphQLEnumType | null;
  annotations: (coordinat: string) => ReactElement | null;
}) {
  const { added, mutual, removed } = compareLists(
    oldEnum?.getValues() ?? [],
    newEnum?.getValues() ?? [],
  );

  const changeType = determineChangeType(oldEnum, newEnum);
  const name = oldEnum?.name ?? newEnum?.name ?? '';

  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newEnum!} oldNode={oldEnum!} />
      <ChangeRow type={changeType} coordinate={name} annotations={annotations}>
        <Change type={changeType}>
          <Keyword term="enum" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        {' {'}
      </ChangeRow>
      {removed.map(a => (
        <DiffEnumValue
          key={a.name}
          newValue={null}
          oldValue={a}
          parentPath={[name]}
          annotations={annotations}
        />
      ))}
      {added.map(a => (
        <DiffEnumValue
          key={a.name}
          newValue={a}
          oldValue={null}
          parentPath={[name]}
          annotations={annotations}
        />
      ))}
      {mutual.map(a => (
        <DiffEnumValue
          key={a.newVersion.name}
          newValue={a.newVersion}
          oldValue={a.oldVersion}
          parentPath={[name]}
          annotations={annotations}
        />
      ))}
      <ChangeRow type={changeType} annotations={annotations}>
        {'}'}
      </ChangeRow>
    </>
  );
}

export function DiffUnion({
  oldUnion,
  newUnion,
  annotations,
}: {
  oldUnion: GraphQLUnionType | null;
  newUnion: GraphQLUnionType | null;
  annotations: (coordinat: string) => ReactElement | null;
}) {
  const { added, mutual, removed } = compareLists(
    oldUnion?.getTypes() ?? [],
    newUnion?.getTypes() ?? [],
  );

  const changeType = determineChangeType(oldUnion, newUnion);
  const name = oldUnion?.name ?? newUnion?.name ?? '';
  const path = [name];
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription newNode={newUnion!} oldNode={oldUnion!} />
      <ChangeRow type={changeType} coordinate={path.join('.')} annotations={annotations}>
        <Change type={changeType}>
          <Keyword term="union" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newUnion?.astNode?.directives ?? []}
          oldDirectives={oldUnion?.astNode?.directives ?? []}
          // parentPath={path}
        />
        {' = '}
      </ChangeRow>
      {removed.map(a => (
        <Fragment key={a.name}>
          <ChangeRow
            type="removal"
            indent
            coordinate={[...path, a.name].join('.')}
            annotations={annotations}
          >
            <Change type="removal">
              | <TypeName name={a.name} />
            </Change>
          </ChangeRow>
        </Fragment>
      ))}
      {added.map(a => (
        <Fragment key={a.name}>
          <ChangeRow
            type="addition"
            indent
            coordinate={[...path, a.name].join('.')}
            annotations={annotations}
          >
            <Change type="addition">
              | <TypeName name={a.name} />
            </Change>
          </ChangeRow>
        </Fragment>
      ))}
      {mutual.map(a => (
        <Fragment key={a.newVersion.name}>
          <ChangeRow
            indent
            coordinate={[...path, a.newVersion.name].join('.')}
            annotations={annotations}
          >
            <Change>
              | <TypeName name={a.newVersion.name} />
            </Change>
          </ChangeRow>
        </Fragment>
      ))}
    </>
  );
}

export function DiffScalar({
  oldScalar,
  newScalar,
  annotations,
}:
  | {
      oldScalar: GraphQLScalarType;
      newScalar: GraphQLScalarType | null;
      annotations: (coordinat: string) => ReactElement | null;
    }
  | {
      oldScalar: GraphQLScalarType | null;
      newScalar: GraphQLScalarType;
      annotations: (coordinat: string) => ReactElement | null;
    }) {
  const changeType = determineChangeType(oldScalar, newScalar);
  const name = newScalar?.name ?? oldScalar?.name ?? '';
  return (
    <>
      <ChangeSpacing type={changeType} />
      <DiffDescription oldNode={oldScalar!} newNode={newScalar!} />
      <ChangeRow type={changeType} coordinate={name} annotations={annotations}>
        <Change type={changeType}>
          <Keyword term="scalar" />
          &nbsp;
          <TypeName name={name} />
        </Change>
        <DiffDirectiveUsages
          newDirectives={newScalar?.astNode?.directives ?? []}
          oldDirectives={oldScalar?.astNode?.directives ?? []}
          // parentPath={[name]}
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
      {removed.map((d, index) => (
        <DiffDirectiveUsage
          key={`removed-${d.name.value}-${index}`}
          newDirective={null}
          oldDirective={d}
        />
      ))}
      {added.map((d, index) => (
        <DiffDirectiveUsage
          key={`added-${d.name.value}-${index}`}
          newDirective={d}
          oldDirective={null}
        />
      ))}
      {mutual.map((d, index) => (
        <DiffDirectiveUsage
          key={`mutual-${d.newVersion.name.value}-${index}`}
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
    ...removed.map((r, index) => (
      <Change type="removal" key={`removal-${r.name.value}-${index}`}>
        <DiffArgumentAST oldArg={r} newArg={null} />
      </Change>
    )),
    ...added.map((r, index) => (
      <Change type="addition" key={`added-${r.name.value}-${index}`}>
        <DiffArgumentAST oldArg={null} newArg={r} />
      </Change>
    )),
    ...mutual.map((r, index) => (
      <Change key={`mutual-${r.newVersion.name.value}-${index}`}>
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
        <Fragment key={index}>
          {e}
          {index === argumentElements.length - 1 ? '' : ', '}
        </Fragment>
      ))}
      {hasArgs && (
        <Change type={argsChangeType}>
          <>)</>
        </Change>
      )}
    </Change>
  );
}

const DiffTypeStr = ({
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
  return (
    <>
      <FieldName name={name} />
      :&nbsp;
      <DiffTypeStr oldType={oldType} newType={newType} />
    </>
  );
}
