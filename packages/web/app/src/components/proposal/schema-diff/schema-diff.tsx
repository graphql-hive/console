/* eslint-disable tailwindcss/no-custom-classname */
import { ReactElement, useMemo } from 'react';
import type { GraphQLSchema } from 'graphql';
import { isIntrospectionType, isSpecifiedDirective } from 'graphql';
import { isPrimitive } from '@graphql-inspector/core/utils/graphql';
import { compareLists } from './compare-lists';
import { ChangeDocument, DiffDirective, DiffType, SchemaDefinitionDiff } from './components';

export function SchemaDiff({
  before,
  after,
  annotations,
}: {
  before: GraphQLSchema;
  after: GraphQLSchema;
  annotations: (coordinate: string) => ReactElement | null;
}): JSX.Element {
  const {
    added: addedTypes,
    mutual: mutualTypes,
    removed: removedTypes,
  } = useMemo(() => {
    return compareLists(
      Object.values(before.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
      Object.values(after.getTypeMap()).filter(t => !isPrimitive(t) && !isIntrospectionType(t)),
    );
  }, [before, after]);

  const {
    added: addedDirectives,
    mutual: mutualDirectives,
    removed: removedDirectives,
  } = useMemo(() => {
    return compareLists(
      before.getDirectives().filter(d => !isSpecifiedDirective(d)),
      after.getDirectives().filter(d => !isSpecifiedDirective(d)),
    );
  }, [before, after]);

  return (
    <ChangeDocument>
      {removedDirectives.map(d => (
        <DiffDirective
          key={d.name}
          newDirective={null}
          oldDirective={d}
          annotations={annotations}
        />
      ))}
      {addedDirectives.map(d => (
        <DiffDirective
          key={d.name}
          newDirective={d}
          oldDirective={null}
          annotations={annotations}
        />
      ))}
      {mutualDirectives.map(d => (
        <DiffDirective
          key={d.newVersion.name}
          newDirective={d.newVersion}
          oldDirective={d.oldVersion}
          annotations={annotations}
        />
      ))}
      <SchemaDefinitionDiff oldSchema={before} newSchema={after} annotations={annotations} />
      {removedTypes.map(a => (
        <DiffType key={a.name} oldType={a} newType={null} annotations={annotations} />
      ))}
      {addedTypes.map(a => (
        <DiffType key={a.name} oldType={null} newType={a} annotations={annotations} />
      ))}
      {mutualTypes.map(a => (
        <DiffType
          key={a.newVersion.name}
          oldType={a.oldVersion}
          newType={a.newVersion}
          annotations={annotations}
        />
      ))}
    </ChangeDocument>
  );
}
