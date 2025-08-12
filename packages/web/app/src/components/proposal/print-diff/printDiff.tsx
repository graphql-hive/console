/* eslint-disable tailwindcss/no-custom-classname */
/** Adapted from graphqljs printSchema */
import type { Maybe } from 'graphql/jsutils/Maybe';
import { isPrintableAsBlockString } from 'graphql/language/blockString';
import type {
  GraphQLScalarType,
  GraphQLSchema,
} from 'graphql';
import {
  Kind,
  print,
  isIntrospectionType,
  DEFAULT_DEPRECATION_REASON,
} from 'graphql';

import { compareLists } from './compareLists';
import { ChangeDocument, ChangeRow, Description, SchemaDefinitionDiff, TypeDiff } from './components';
import { isPrimitive } from '@graphql-inspector/core/utils/graphql';

type SchemaRootFields = {
  query: string;
  mutation: string;
  subscription: string;
}

export function printSchemaDiff(
  oldSchema: GraphQLSchema,
  newSchema: GraphQLSchema,
): JSX.Element {

  const {
    added: addedTypes,
    mutual: mutualTypes,
    removed: removedTypes,
  } = compareLists(
    Object.values(oldSchema.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
    Object.values(newSchema.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
  );

  return (
    <ChangeDocument>
      <SchemaDefinitionDiff oldSchema={oldSchema} newSchema={newSchema}/>
      {addedTypes.map(a => {
        return (
          <ChangeRow key={a.name} type='addition'><TypeDiff newType={a} oldType={null}/></ChangeRow>
        )
      })}
      {removedTypes.map(a => {
        return (
          <ChangeRow type='removal' key={a.name}><TypeDiff oldType={a} newType={null}/></ChangeRow>
        )
      })}
      {mutualTypes.map(a => {
        return (
          <TypeDiff key={a.newVersion.name} oldType={a.oldVersion} newType={a.newVersion}/>
        )
      })}
    </ChangeDocument>
  );

  // compareLists(oldSchema.getDirectives(), newSchema.getDirectives(), {
  //   onAdded(directive) {
  //     addChange(directiveAdded(directive));
  //   },
  //   onRemoved(directive) {
  //     addChange(directiveRemoved(directive));
  //   },
  //   onMutual(directive) {
  //     changesInDirective(directive.oldVersion, directive.newVersion, addChange);
  //   },
  // });

  // compareLists(oldSchema.astNode?.directives || [], newSchema.astNode?.directives || [], {
  //   onAdded(directive) {
  //     addChange(directiveUsageAdded(Kind.SCHEMA_DEFINITION, directive, newSchema));
  //   },
  //   onRemoved(directive) {
  //     addChange(directiveUsageRemoved(Kind.SCHEMA_DEFINITION, directive, oldSchema));
  //   },
  // });

  // return changes;
}

// export function printSchemaDiff<T>(beforeSchema: GraphQLSchema, afterSchema: GraphQLSchema, printFn: (before: ASTNode | undefined, after: ASTNode | undefined) => T): T {
//   return printFilteredSchema(
//     beforeSchema,
//     (n) => !isSpecifiedDirective(n),
//     isDefinedType,
//   );
// }

// // export function printIntrospectionSchema(schema: GraphQLSchema): string {
// //   return printFilteredSchema(schema, isSpecifiedDirective, isIntrospectionType);
// }

// function isDefinedType(type: GraphQLNamedType): boolean {
//   return !isSpecifiedScalarType(type) && !isIntrospectionType(type);
// }

// function printFilteredSchema(
//   schema: GraphQLSchema,
//   directiveFilter: (type: GraphQLDirective) => boolean,
//   typeFilter: (type: GraphQLNamedType) => boolean,
// ): string {
//   const directives = schema.getDirectives().filter(directiveFilter);
//   const types = Object.values(schema.getTypeMap()).filter(typeFilter);

//   return [
//     printSchemaDefinition(schema),
//     ...directives.map((directive) => printDirective(directive)),
//     ...types.map((type) => printType(type)),
//   ]
//     .filter(Boolean)
//     .join('\n\n');
// }

// function printSchemaDefinition(schema: GraphQLSchema): Maybe<string> {
//   if (schema.description == null && isSchemaOfCommonNames(schema)) {
//     return;
//   }

//   const operationTypes = [];

//   const queryType = schema.getQueryType();
//   if (queryType) {
//     operationTypes.push(`  query: ${queryType.name}`);
//   }

//   const mutationType = schema.getMutationType();
//   if (mutationType) {
//     operationTypes.push(`  mutation: ${mutationType.name}`);
//   }

//   const subscriptionType = schema.getSubscriptionType();
//   if (subscriptionType) {
//     operationTypes.push(`  subscription: ${subscriptionType.name}`);
//   }

//   return printDescription(schema) + `schema {\n${operationTypes.join('\n')}\n}`;
// }

// /**
//  * GraphQL schema define root types for each type of operation. These types are
//  * the same as any other type and can be named in any manner, however there is
//  * a common naming convention:
//  *
//  * ```graphql
//  *   schema {
//  *     query: Query
//  *     mutation: Mutation
//  *     subscription: Subscription
//  *   }
//  * ```
//  *
//  * When using this naming convention, the schema description can be omitted.
//  */
// function isSchemaOfCommonNames(schema: GraphQLSchema): boolean {
//   const queryType = schema.getQueryType();
//   if (queryType && queryType.name !== 'Query') {
//     return false;
//   }

//   const mutationType = schema.getMutationType();
//   if (mutationType && mutationType.name !== 'Mutation') {
//     return false;
//   }

//   const subscriptionType = schema.getSubscriptionType();
//   if (subscriptionType && subscriptionType.name !== 'Subscription') {
//     return false;
//   }

//   return true;
// }

// export function printTypeName(type: GraphQLNamedType): string {
//   if (isScalarType(type)) {
//     return printScalar(type);
//   }
//   if (isObjectType(type)) {
//     return printObject(type);
//   }
//   if (isInterfaceType(type)) {
//     return printInterface(type);
//   }
//   if (isUnionType(type)) {
//     return printUnion(type);
//   }
//   if (isEnumType(type)) {
//     return printEnum(type);
//   }
//   if (isInputObjectType(type)) {
//     return printInputObject(type);
//   }
//   /* c8 ignore next 3 */
//   // Not reachable, all possible types have been considered.
//   invariant(false, 'Unexpected type: ' + inspect(type));
// }

// function printScalar(type: GraphQLScalarType): string {
//   return (
//     printDescription(type) + `scalar ${type.name}` + printSpecifiedByURL(type)
//   );
// }

// function printImplementedInterfaces(
//   type: GraphQLObjectType | GraphQLInterfaceType,
// ): string {
//   const interfaces = type.getInterfaces();
//   return interfaces.length
//     ? ' implements ' + interfaces.map((i) => i.name).join(' & ')
//     : '';
// }

// function printObject(type: GraphQLObjectType): string {
//   return (
//     printDescription(type) +
//     `type ${type.name}` +
//     printImplementedInterfaces(type) +
//     printFields(type)
//   );
// }

// function printInterface(type: GraphQLInterfaceType): string {
//   return (
//     printDescription(type) +
//     `interface ${type.name}` +
//     printImplementedInterfaces(type) +
//     printFields(type)
//   );
// }

// function printUnion(type: GraphQLUnionType): string {
//   const types = type.getTypes();
//   const possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
//   return printDescription(type) + 'union ' + type.name + possibleTypes;
// }

// function printEnum(type: GraphQLEnumType): string {
//   const values = type
//     .getValues()
//     .map(
//       (value, i) =>
//         printDescription(value, '  ', !i) +
//         '  ' +
//         value.name +
//         printDeprecated(value.deprecationReason),
//     );

//   return printDescription(type) + `enum ${type.name}` + printBlock(values);
// }

// function printInputObject(type: GraphQLInputObjectType): string {
//   const fields = Object.values(type.getFields()).map(
//     (f, i) => printDescription(f, '  ', !i) + '  ' + printInputValue(f),
//   );
//   return (
//     printDescription(type) +
//     `input ${type.name}` +
//     (type.isOneOf ? ' @oneOf' : '') +
//     printBlock(fields)
//   );
// }

// function printFields(type: GraphQLObjectType | GraphQLInterfaceType): string {
//   const fields = Object.values(type.getFields()).map(
//     (f, i) =>
//       printDescription(f, '  ', !i) +
//       '  ' +
//       f.name +
//       printArgs(f.args, '  ') +
//       ': ' +
//       String(f.type) +
//       printDeprecated(f.deprecationReason),
//   );
//   return printBlock(fields);
// }

// function printBlock(items: ReadonlyArray<string>): string {
//   return items.length !== 0 ? ' {\n' + items.join('\n') + '\n}' : '';
// }

// function printArgs(
//   args: ReadonlyArray<GraphQLArgument>,
//   indentation: string = '',
// ): string {
//   if (args.length === 0) {
//     return '';
//   }

//   // If every arg does not have a description, print them on one line.
//   if (args.every((arg) => !arg.description)) {
//     return '(' + args.map(printInputValue).join(', ') + ')';
//   }

//   return (
//     '(\n' +
//     args
//       .map(
//         (arg, i) =>
//           printDescription(arg, '  ' + indentation, !i) +
//           '  ' +
//           indentation +
//           printInputValue(arg),
//       )
//       .join('\n') +
//     '\n' +
//     indentation +
//     ')'
//   );
// }

// function printInputValue(arg: GraphQLInputField): string {
//   const defaultAST = astFromValue(arg.defaultValue, arg.type);
//   let argDecl = arg.name + ': ' + String(arg.type);
//   if (defaultAST) {
//     argDecl += ` = ${print(defaultAST)}`;
//   }
//   return argDecl + printDeprecated(arg.deprecationReason);
// }

// function printDirective(directive: GraphQLDirective): string {
//   return (
//     printDescription(directive) +
//     'directive @' +
//     directive.name +
//     printArgs(directive.args) +
//     (directive.isRepeatable ? ' repeatable' : '') +
//     ' on ' +
//     directive.locations.join(' | ')
//   );
// }

// function printDeprecated(reason: Maybe<string>): string {
//   if (reason == null) {
//     return '';
//   }
//   if (reason !== DEFAULT_DEPRECATION_REASON) {
//     const astValue = print({ kind: Kind.STRING, value: reason });
//     return ` @deprecated(reason: ${astValue})`;
//   }
//   return <div className='directive'>@deprecated</div>;
// }

// function printSpecifiedByURL(scalar: GraphQLScalarType): JSX.Element | null {
//   if (scalar.specifiedByURL == null) {
//     return null;
//   }
//   const astValue = print({
//     kind: Kind.STRING,
//     value: scalar.specifiedByURL,
//   });
//   return <div className='directive'>{`@specifiedBy(url: ${astValue})`}</div>;
// }

// function printDescription(
//   def: { readonly description: Maybe<string> },
//   indentation: string = '',
//   // firstInBlock: boolean = true,
// ): JSX.Element | null {
//   const { description } = def;
//   if (description == null) {
//     return null;
//   }

//   const blockString = print({
//     kind: Kind.STRING,
//     value: description,
//     block: isPrintableAsBlockString(description),
//   });

//   return <Description>{blockString.replace(/\n/g, '\n' + indentation) + '\n'}</Description>;
// }
