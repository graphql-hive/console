import { useCallback, useState } from 'react';
import {
  getNamedType,
  isInterfaceType,
  isObjectType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLSchema,
} from 'graphql';

export type LaboratoryActivePanel =
  | 'collections'
  | 'history'
  | 'docs'
  | 'tests'
  | 'settings'
  | null;

/**
 * Targets are held by name rather than by schema object: a poll or an endpoint
 * switch replaces every type instance, and a stack of stale references would
 * keep rendering a schema the user is no longer looking at.
 */
export type LaboratoryDocsTarget =
  | { kind: 'type'; name: string }
  | { kind: 'field'; typeName: string; fieldName: string };

/**
 * Builder rows identify a field by its dotted path from an operation root
 * (`query.me.id`), which carries no parent type. Walking it back to one is what
 * lets a row open the field it actually represents rather than its return type.
 */
export const docsTargetFromPath = (
  path: string[],
  schema: GraphQLSchema | null,
): LaboratoryDocsTarget | null => {
  const [operation, ...segments] = path;

  if (!schema || segments.length === 0) {
    return null;
  }

  let type: GraphQLNamedType | null | undefined =
    operation === 'query'
      ? schema.getQueryType()
      : operation === 'mutation'
        ? schema.getMutationType()
        : operation === 'subscription'
          ? schema.getSubscriptionType()
          : null;

  for (let i = 0; i < segments.length; i++) {
    if (!type || (!isObjectType(type) && !isInterfaceType(type))) {
      return null;
    }

    const parentName = type.name;
    const field: GraphQLField<unknown, unknown> | undefined = type.getFields()[segments[i]];

    if (!field) {
      return null;
    }

    if (i === segments.length - 1) {
      return { kind: 'field', typeName: parentName, fieldName: field.name };
    }

    type = getNamedType(field.type);
  }

  return null;
};

export interface LaboratoryDocsState {
  activePanel: LaboratoryActivePanel;
  /** Empty means the root view listing the operation types. */
  docsNavStack: LaboratoryDocsTarget[];
}

export interface LaboratoryDocsActions {
  setActivePanel: (panel: LaboratoryActivePanel) => void;
  openDocs: (target?: LaboratoryDocsTarget) => void;
  pushDocs: (target: LaboratoryDocsTarget) => void;
  popDocs: () => void;
  resetDocs: () => void;
}

export const useDocs = (props: {
  defaultActivePanel?: LaboratoryActivePanel;
}): LaboratoryDocsState & LaboratoryDocsActions => {
  const [activePanel, setActivePanel] = useState<LaboratoryActivePanel>(
    props.defaultActivePanel ?? null,
  );
  const [docsNavStack, setDocsNavStack] = useState<LaboratoryDocsTarget[]>([]);

  const pushDocs = useCallback((target: LaboratoryDocsTarget) => {
    setDocsNavStack(current => [...current, target]);
  }, []);

  const popDocs = useCallback(() => {
    setDocsNavStack(current => current.slice(0, -1));
  }, []);

  const resetDocs = useCallback(() => {
    setDocsNavStack([]);
  }, []);

  const openDocs = useCallback((target?: LaboratoryDocsTarget) => {
    setActivePanel('docs');

    if (target) {
      setDocsNavStack(current => [...current, target]);
    }
  }, []);

  return {
    activePanel,
    docsNavStack,
    setActivePanel,
    openDocs,
    pushDocs,
    popDocs,
    resetDocs,
  };
};
