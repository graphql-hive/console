import { cn } from '@/lib/utils'
import { GraphQLArgument, GraphQLEnumType, GraphQLEnumValue, GraphQLField, GraphQLInterfaceType, GraphQLNamedType, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLSchema, isEnumType, isInputObjectType, isInterfaceType, isObjectType, isScalarType, isUnionType, OperationTypeNode, print } from "graphql"
import { compareLists } from './compareLists'
import { ReactNode } from 'react';

type RootFieldsType = {
  query: GraphQLField<any, any>;
  mutation: GraphQLField<any, any>;
  subscription: GraphQLField<any, any>;
}

const TAB = <>&nbsp;&nbsp;&nbsp;</>;

export function ChangeDocument(props: { children: ReactNode; className?: string }) {
  return (
    <table
      aria-label="change-document"
      className={cn('min-w-full whitespace-pre font-mono text-white', props.className)}
      style={{counterReset: 'olddoc newdoc'}}
    >
      <tbody>{props.children}</tbody>
    </table>
  );
}

export function ChangeRow(props: {
  children: ReactNode;

  /** The line number for the current schema version */
  lineNumber?: number; // @todo make this required and implement line numbers...

  /** The line number associated for the proposed schema */
  diffLineNumber?: number;

  className?: string;
  /** Default is mutual */
  type?: 'removal' | 'addition' | 'mutual'
}) {
  const incrementCounter = props.type === 'mutual' || props.type === undefined ? 'olddoc newdoc' : (props.type === 'removal' ? 'olddoc' : 'newdoc')
  return (
    <tr
      className={cn((props.lineNumber ?? 0) % 2 === 0 && 'bg-gray-900', props.className)}
      style={{counterIncrement: incrementCounter}}
    >
      <td className={cn('w-[42px] min-w-fit select-none p-1 pr-3 text-right text-gray-600 schema-doc-row-old', props.type === 'addition' && 'invisible')}/>
      <td className={cn('w-[42px] min-w-fit select-none p-1 pr-3 text-right text-gray-600 schema-doc-row-new', props.type === 'removal' && 'invisible')}/>
      <td className={cn('p-1 pl-2', props.type === 'removal' && 'bg-red-700', props.type === 'addition' && 'bg-green-800')}>{props.children}</td>
    </tr>
  );
}

export function Keyword(props: { term: string }) {
  return (
    <span className='text-gray-400'>{props.term}</span>
  )
}

export function Removal(props: { children: React.ReactElement, className?: string }): JSX.Element {
  return (
    <span className={cn('bg-red-700', props.className)}>{props.children}</span>
  )
}

export function Addition(props: { children: React.ReactElement, className?: string }): JSX.Element {
  return (
    <span className={cn('bg-green-800', props.className)}>{props.children}</span>
  )
}

export function Description(props: { children: React.ReactNode }): JSX.Element {
  return <div className='text-gray-600'>{props.children}</div>
}

export function FieldName(props: { name: string }): JSX.Element {
  return <span>{props.name}</span>
}

export function FieldReturnType(props: { returnType: string }): JSX.Element {
  return <span className="text-orange-400">{props.returnType}</span>
}

export function FieldDiff({ oldField, newField }: { oldField: GraphQLField<any, any, any> | null, newField: GraphQLField<any, any, any> | null }) {
  const oldReturnType = oldField?.type.toString();
  const newReturnType = newField?.type.toString();
  if (newField && oldReturnType === newReturnType) {
    return (
      <>
        {TAB}<FieldName name={newField.name}/>:&nbsp;<FieldReturnType returnType={newField.type.toString()}/>
      </>
    );
  }
  return (
    <>
      {TAB}<FieldName name={(newField ?? oldField)?.name ?? ''}/>:&nbsp;
      {oldReturnType && <Removal><FieldReturnType returnType={oldReturnType}/></Removal>}
      {newReturnType && <Addition className={cn(oldReturnType && 'ml-2')}><FieldReturnType returnType={newReturnType}/></Addition>}
    </>
  );
}

export function DirectiveName(props: { name: string }) {
  return (
    <span className="text-gray-200">@{props.name}</span>
  );
}

export function DirectiveDiff(props: { name: string, oldArguments: GraphQLArgument[], newArguments: GraphQLArgument[], newLine?: boolean }) {
  const {
    added,
    mutual,
    removed,
  } = compareLists(props.oldArguments, props.newArguments)
  return (
    <span className={cn(props.newLine && 'block ml-4')}>
      <DirectiveName name={props.name}/>
      {removed.map(a => (
        <Removal key={a.name}><DirectiveArgument arg={a}/></Removal>
      ))}
      {added.map(a => (
        <Addition key={a.name}><DirectiveArgument arg={a}/></Addition>
      ))}
      {/* @todo This should do a diff on the nested fields... */}
      {mutual.map(a => (
        <DirectiveArgument key={a.newVersion.name} arg={a.newVersion}/>
      ))}
    </span>
  );
}

export function DirectiveArgument(props: { arg: GraphQLArgument }) {
  return (
    // @todo
    <span>
      {props.arg.name}: {props.arg.type.toString()}{props.arg.defaultValue === undefined ? '' : ` ${JSON.stringify(props.arg.defaultValue)}`}
    </span>
  );
}

export function SchemaDefinitionDiff({ oldSchema, newSchema }: { oldSchema: GraphQLSchema, newSchema: GraphQLSchema }) {
  const defaultNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };
  const oldRoot: RootFieldsType = {
    query: {
      args: [],
      name: 'query',
      type: oldSchema.getQueryType() ?? { name: defaultNames.query, toString: () => defaultNames.query } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    mutation:{
      args: [],
      name: 'mutation',
      type: oldSchema.getMutationType() ?? { name: defaultNames.mutation, toString: () => defaultNames.mutation } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    subscription:{
      args: [],
      name: 'subscription',
      type: oldSchema.getSubscriptionType() ?? { name: defaultNames.subscription, toString: () => defaultNames.subscription } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    }
  };
  const newRoot: RootFieldsType = {
    query: {
      args: [],
      name: 'query',
      type: newSchema.getQueryType() ?? { name: defaultNames.query, toString: () => defaultNames.query } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    mutation:{
      args: [],
      name: 'mutation',
      type: newSchema.getMutationType() ?? { name: defaultNames.mutation, toString: () => defaultNames.mutation } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    },
    subscription:{
      args: [],
      name: 'subscription',
      type: newSchema.getSubscriptionType() ?? { name: defaultNames.subscription, toString: () => defaultNames.subscription } as GraphQLOutputType,
      astNode: null,
      deprecationReason: null,
      description: null,
      extensions: {},
    }
  };

  return (
    <>
      <ChangeRow>
        <Keyword term='schema'/>{' {'}
      </ChangeRow>
      <ChangeRow>
        <FieldDiff oldField={oldRoot.query} newField={newRoot.query}/>
      </ChangeRow>
      <ChangeRow>
        <FieldDiff oldField={oldRoot.mutation} newField={newRoot.mutation}/>
      </ChangeRow>
      <ChangeRow>
        <FieldDiff oldField={oldRoot.subscription} newField={newRoot.subscription}/>
      </ChangeRow>
      <ChangeRow>{'}'}</ChangeRow>
    </>
  )
}

/** For any named type */
export function TypeDiff({ oldType, newType }: { oldType: GraphQLNamedType | null, newType: GraphQLNamedType | null}) {
  if (isEnumType(oldType) && isEnumType(newType)) {
    return <DiffEnum oldEnum={oldType} newEnum={newType}/>
  }
  if (isUnionType(oldType) && isUnionType(newType)) {
    // changesInUnion(oldType, newType, addChange);
  }
  if (isInputObjectType(oldType) && isInputObjectType(newType)) {
    // changesInInputObject(oldType, newType, addChange);
  }
  if (isObjectType(oldType) && isObjectType(newType)) {
    return <DiffObject oldObject={oldType} newObject={newType} />
  }
  if (isInterfaceType(oldType) && isInterfaceType(newType)) {
    return <DiffObject oldObject={oldType} newObject={newType} />
  }
  if (isScalarType(oldType) && isScalarType(newType)) {
    return <DiffScalar oldScalar={oldType} newScalar={newType} />
  }

  {
    // addChange(typeKindChanged(oldType, newType));
  }
};

export function TypeName({ name }: { name: string }) {
  return (
    <span className="text-orange-400">{name}</span>
  );
}

export function DiffObject({ oldObject, newObject }: { oldObject: GraphQLObjectType | GraphQLInterfaceType, newObject: GraphQLObjectType | GraphQLInterfaceType }) {
  const {
    added,
    mutual,
    removed,
  } = compareLists(Object.values(oldObject.getFields()), Object.values(newObject.getFields()));
  return (
    <>
      <ChangeRow>
        <Keyword term='type'/>&nbsp;<TypeName name={oldObject?.name ?? newObject?.name ?? ''}/>{' {'}
      </ChangeRow>
      {removed.map(a => (
        <ChangeRow type='removal' key={a.name}>
          <FieldDiff oldField={a} newField={null}/>
        </ChangeRow>
      ))}
      {added.map(a => (
        <ChangeRow type='addition' key={a.name}>
          <FieldDiff oldField={null} newField={a}/>
        </ChangeRow>
      ))}
      {/* @todo This should do a diff on the nested fields... */}
      {mutual.map(a => (
        <ChangeRow key={a.newVersion.name}>
          <FieldDiff oldField={a.oldVersion} newField={a.newVersion}/>
        </ChangeRow>
      ))}
      <ChangeRow>{'}'}</ChangeRow>
    </>
  );
}

export function DiffEnum({ oldEnum, newEnum }: { oldEnum: GraphQLEnumType | null, newEnum: GraphQLEnumType | null }) {
  const {
    added,
    mutual,
    removed,
  } = compareLists(oldEnum?.getValues() ?? [], newEnum?.getValues() ?? []);
  return (
    <>
      <ChangeRow>
        <Keyword term='enum'/>&nbsp;<TypeName name={oldEnum?.name ?? newEnum?.name ?? ''}/>{' {'}
      </ChangeRow>
      {removed.map(a => (
        <Removal key={a.name}><EnumValue value={a}/></Removal>
      ))}
      {added.map(a => (
        <Addition key={a.name}><EnumValue value={a}/></Addition>
      ))}
      {/* @todo This should do a diff on the nested fields... */}
      {mutual.map(a => (
        <EnumValue key={a.newVersion.name} value={a.newVersion}/>
      ))}
      <ChangeRow>{'}'}</ChangeRow>
    </>
  );
}

export function DiffScalar({ oldScalar, newScalar }: { oldScalar: GraphQLScalarType | null; newScalar: GraphQLScalarType | null }) {
  if (oldScalar?.name === newScalar?.name) {
    return (
      <ChangeRow>
        <Keyword term='scalar'/>&nbsp;
        <TypeName name={newScalar?.name ?? ''}/>
        {/* { @todo diff directives} */}
      </ChangeRow>
    );
  }
  return (
    <ChangeRow>
      <Keyword term='scalar'/>&nbsp;
      {oldScalar && <Removal><TypeName name={oldScalar.name}/></Removal>}
      {newScalar && <Addition className={cn(oldScalar && 'ml-2')}><TypeName name={newScalar.name}/></Addition>}
      {/* { @todo diff directives} */}
    </ChangeRow>
  );
}

export function EnumValue(props: { value: GraphQLEnumValue }) {
  return <span>{TAB}<TypeName name={props.value.name}/></span>
}