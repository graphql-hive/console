/* eslint-disable tailwindcss/no-custom-classname */
import type { GraphQLSchema } from 'graphql';
import { isIntrospectionType, isSpecifiedDirective } from 'graphql';
import { isPrimitive } from '@graphql-inspector/core/utils/graphql';
import { compareLists } from './compare-lists';
import { ChangeDocument, DiffDirective, DiffType, SchemaDefinitionDiff } from './components';

export function printSchemaDiff(oldSchema: GraphQLSchema, newSchema: GraphQLSchema): JSX.Element {
  const {
    added: addedTypes,
    mutual: mutualTypes,
    removed: removedTypes,
  } = compareLists(
    Object.values(oldSchema.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
    Object.values(newSchema.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
  );

  const {
    added: addedDirectives,
    mutual: mutualDirectives,
    removed: removedDirectives,
  } = compareLists(
    oldSchema.getDirectives().filter(d => !isSpecifiedDirective(d)),
    newSchema.getDirectives().filter(d => !isSpecifiedDirective(d)),
  );

  return (
    <ChangeDocument>
      {removedDirectives.map(d => (
        <DiffDirective key={d.name} newDirective={null} oldDirective={d} />
      ))}
      {addedDirectives.map(d => (
        <DiffDirective key={d.name} newDirective={d} oldDirective={null} />
      ))}
      {mutualDirectives.map(d => (
        <DiffDirective
          key={d.newVersion.name}
          newDirective={d.newVersion}
          oldDirective={d.oldVersion}
        />
      ))}
      <SchemaDefinitionDiff oldSchema={oldSchema} newSchema={newSchema} />
      {addedTypes.map(a => (
        <DiffType key={a.name} oldType={null} newType={a} />
      ))}
      {removedTypes.map(a => (
        <DiffType key={a.name} oldType={a} newType={null} />
      ))}
      {mutualTypes.map(a => (
        <DiffType key={a.newVersion.name} oldType={a.oldVersion} newType={a.newVersion} />
      ))}
    </ChangeDocument>
  );
}
