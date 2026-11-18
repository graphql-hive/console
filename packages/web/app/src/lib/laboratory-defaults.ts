import { withLinkedOperation } from '@/lib/laboratory-linked-operation';
import { laboratoryStorage } from '@/lib/laboratory-storage';
import type {
  LaboratoryEnv,
  LaboratoryOperation,
  LaboratoryPreflight,
  LaboratorySettings,
  LaboratoryTab,
} from '@graphql-hive/laboratory';

export interface LinkedOperation {
  operation: LaboratoryOperation;
  matchBy: 'id' | 'content';
}

export interface LaboratoryDefaults {
  defaultOperations: LaboratoryOperation[];
  defaultTabs: LaboratoryTab[];
  defaultActiveTabId: string | null;
  defaultSettings: LaboratorySettings | null;
  defaultEnv: LaboratoryEnv;
  defaultPluginsState: Record<string, any>;
  defaultPreflight: LaboratoryPreflight | null;
}

/**
 * Reads the target's saved lab state at mount time, so every remount starts from the latest
 * writes. A linked operation is saved straight away so a later remount keeps it.
 */
export function readLaboratoryDefaults(
  targetId: string,
  linked: LinkedOperation | null,
  preflightScript: string | null,
): LaboratoryDefaults {
  const storage = laboratoryStorage(targetId);

  let state = {
    operations: storage.get<LaboratoryOperation[]>('operations', []),
    tabs: storage.get<LaboratoryTab[]>('tabs', []),
    activeTabId: storage.get<string | null>('activeTabId', null),
  };

  if (linked) {
    state = withLinkedOperation(state, linked.operation, linked.matchBy);
    storage.set('operations', state.operations);
    storage.set('tabs', state.tabs);
    storage.set('activeTabId', state.activeTabId);
  }

  return {
    defaultOperations: state.operations,
    defaultTabs: state.tabs,
    defaultActiveTabId: state.activeTabId,
    defaultSettings: storage.get<LaboratorySettings | null>('settings', null),
    defaultEnv: storage.get<LaboratoryEnv>('env', { variables: {} }),
    defaultPluginsState: storage.get<Record<string, any>>('pluginsState', {}),
    defaultPreflight: preflightScript
      ? { script: preflightScript, enabled: storage.get('preflightEnabled', false) }
      : null,
  };
}

/**
 * urql keeps the previous target's data while the next one loads, so the lab may only mount once
 * both page queries have settled on the same target.
 */
export function resolveLaboratoryTargetId(queries: {
  pageTargetId: string | null;
  pageFetching: boolean;
  labTargetId: string | null;
  labFetching: boolean;
}): string | null {
  if (queries.pageFetching || queries.labFetching || !queries.pageTargetId) {
    return null;
  }

  return queries.pageTargetId === queries.labTargetId ? queries.pageTargetId : null;
}
