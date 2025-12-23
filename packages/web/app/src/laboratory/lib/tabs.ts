import { useCallback, useState } from 'react';
import type { LaboratoryEnv } from '@/laboratory/lib/env';
import type { LaboratoryHistoryRequest } from '@/laboratory/lib/history';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';
import type { LaboratoryPreflight } from '@/laboratory/lib/preflight';
import type { LaboratoryTest } from '@/laboratory/lib/tests';

export interface LaboratoryTabOperation {
  id: string;
  type: 'operation';
  data: Pick<LaboratoryOperation, 'id' | 'name'>;
  readOnly?: boolean;
}

export interface LaboratoryTabHistory {
  id: string;
  type: 'history';
  data: Pick<LaboratoryHistoryRequest, 'id'>;
  readOnly?: boolean;
}

export interface LaboratoryTabPreflight {
  id: string;
  type: 'preflight';
  data: LaboratoryPreflight;
  readOnly?: boolean;
}

export interface LaboratoryTabEnv {
  id: string;
  type: 'env';
  data: LaboratoryEnv;
  readOnly?: boolean;
}

export interface LaboratoryTabTest {
  id: string;
  type: 'test';
  data: Pick<LaboratoryTest, 'id' | 'name'>;
  readOnly?: boolean;
}

export interface LaboratoryTabSettings {
  id: string;
  type: 'settings';
  data: unknown;
  readOnly?: boolean;
}

export interface LaboratoryTabCustom {
  id: string;
  type: string;
  data: unknown;
  readOnly?: boolean;
}

export type LaboratoryTabData =
  | Pick<LaboratoryOperation, 'id' | 'name'>
  | Pick<LaboratoryHistoryRequest, 'id'>
  | LaboratoryPreflight
  | LaboratoryEnv;

export type LaboratoryTab =
  | LaboratoryTabOperation
  | LaboratoryTabPreflight
  | LaboratoryTabEnv
  | LaboratoryTabHistory
  | LaboratoryTabSettings
  | LaboratoryTabTest
  | LaboratoryTabCustom;

export interface LaboratoryTabsState {
  tabs: LaboratoryTab[];
}

export interface LaboratoryTabsActions {
  activeTab: LaboratoryTab | null;
  setActiveTab: (tab: LaboratoryTab) => void;
  setTabs: (tabs: LaboratoryTab[]) => void;
  addTab: (tab: Omit<LaboratoryTab, 'id'>) => LaboratoryTab;
  updateTab: (id: string, data: LaboratoryTabData) => void;
  deleteTab: (tabId: string) => void;
}

export const useTabs = (props: {
  defaultTabs?: LaboratoryTab[] | null;
  defaultActiveTabId?: string | null;
  onTabsChange?: (tabs: LaboratoryTab[]) => void;
  onActiveTabIdChange?: (tabId: string | null) => void;
}): LaboratoryTabsState & LaboratoryTabsActions => {
  // eslint-disable-next-line react/hook-use-state
  const [tabs, _setTabs] = useState<LaboratoryTab[]>(props.defaultTabs ?? []);

  // eslint-disable-next-line react/hook-use-state
  const [activeTab, _setActiveTab] = useState<LaboratoryTab | null>(
    props.defaultTabs?.find(t => t.id === props.defaultActiveTabId) ??
      props.defaultTabs?.[0] ??
      null,
  );

  const setActiveTab = useCallback(
    (tab: LaboratoryTab) => {
      _setActiveTab(tab);
      props.onActiveTabIdChange?.(tab?.id ?? null);
    },
    [props],
  );

  const setTabs = useCallback(
    (tabs: LaboratoryTab[]) => {
      _setTabs(tabs);
      props.onTabsChange?.(tabs);
    },
    [props],
  );

  const addTab = useCallback(
    (tab: Omit<LaboratoryTab, 'id'>) => {
      const newTab = { ...tab, id: crypto.randomUUID() } as LaboratoryTab;
      const newTabs = [...(tabs ?? []), newTab] as LaboratoryTab[];
      _setTabs(newTabs);
      props.onTabsChange?.(newTabs);

      return newTab;
    },
    [tabs, props],
  );

  const deleteTab = useCallback(
    (tabId: string) => {
      const newTabs = tabs.filter(t => t.id !== tabId);
      _setTabs(newTabs);
      props.onTabsChange?.(newTabs);
    },
    [tabs, props],
  );

  const updateTab = useCallback(
    (id: string, newData: LaboratoryTabData) => {
      const newTabs = tabs.map(t => (t.id === id ? { ...t, data: newData } : t)) as LaboratoryTab[];
      _setTabs(newTabs);
      props.onTabsChange?.(newTabs);
    },
    [tabs, props],
  );

  return {
    activeTab,
    setActiveTab,
    tabs,
    setTabs,
    addTab,
    deleteTab,
    updateTab,
  };
};
