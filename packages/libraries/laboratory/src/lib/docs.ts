import { useCallback, useState } from 'react';

export type LaboratoryActivePanel = 'collections' | 'history' | 'docs' | 'tests' | 'settings' | null;

/**
 * Targets are held by name rather than by schema object: a poll or an endpoint
 * switch replaces every type instance, and a stack of stale references would
 * keep rendering a schema the user is no longer looking at.
 */
export type LaboratoryDocsTarget =
  | { kind: 'type'; name: string }
  | { kind: 'field'; typeName: string; fieldName: string };

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
