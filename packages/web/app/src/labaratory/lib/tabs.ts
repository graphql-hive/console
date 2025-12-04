import { useCallback, useState } from 'react';
import type { LabaratoryEnv } from '@/labaratory/lib/env';
import type { LabaratoryHistoryRequest } from '@/labaratory/lib/history';
import type { LabaratoryOperation } from '@/labaratory/lib/operations';
import type { LabaratoryPreflight } from '@/labaratory/lib/preflight';
import type { LabaratoryTest } from '@/labaratory/lib/tests';

export interface LabaratoryTabOperation {
  id: string;
  type: 'operation';
  data: Pick<LabaratoryOperation, 'id' | 'name'>;
  readOnly?: boolean;
}

export interface LabaratoryTabHistory {
  id: string;
  type: 'history';
  data: Pick<LabaratoryHistoryRequest, 'id'>;
  readOnly?: boolean;
}

export interface LabaratoryTabPreflight {
  id: string;
  type: 'preflight';
  data: LabaratoryPreflight;
  readOnly?: boolean;
}

export interface LabaratoryTabEnv {
  id: string;
  type: 'env';
  data: LabaratoryEnv;
  readOnly?: boolean;
}

export interface LabaratoryTabTest {
  id: string;
  type: 'test';
  data: Pick<LabaratoryTest, 'id' | 'name'>;
  readOnly?: boolean;
}

export interface LabaratoryTabSettings {
  id: string;
  type: 'settings';
  data: unknown;
  readOnly?: boolean;
}

export type LabaratoryTabData =
  | Pick<LabaratoryOperation, 'id' | 'name'>
  | Pick<LabaratoryHistoryRequest, 'id'>
  | LabaratoryPreflight
  | LabaratoryEnv;
export type LabaratoryTab =
  | LabaratoryTabOperation
  | LabaratoryTabPreflight
  | LabaratoryTabEnv
  | LabaratoryTabHistory
  | LabaratoryTabSettings
  | LabaratoryTabTest;

export interface LabaratoryTabsState {
  tabs: LabaratoryTab[];
}

export interface LabaratoryTabsActions {
  activeTab: LabaratoryTab | null;
  setActiveTab: (tab: LabaratoryTab) => void;
  setTabs: (tabs: LabaratoryTab[]) => void;
  addTab: (tab: Omit<LabaratoryTab, 'id'>) => LabaratoryTab;
  updateTab: (id: string, data: LabaratoryTabData) => void;
  deleteTab: (tabId: string) => void;
}

export const useTabs = (props: {
  defaultTabs?: LabaratoryTab[] | null;
  defaultActiveTabId?: string | null;
  onTabsChange?: (tabs: LabaratoryTab[]) => void;
  onActiveTabIdChange?: (tabId: string | null) => void;
}): LabaratoryTabsState & LabaratoryTabsActions => {
  // eslint-disable-next-line react/hook-use-state
  const [tabs, _setTabs] = useState<LabaratoryTab[]>(props.defaultTabs ?? []);

  // eslint-disable-next-line react/hook-use-state
  const [activeTab, _setActiveTab] = useState<LabaratoryTab | null>(
    props.defaultTabs?.find(t => t.id === props.defaultActiveTabId) ??
      props.defaultTabs?.[0] ??
      null,
  );

  const setActiveTab = useCallback(
    (tab: LabaratoryTab) => {
      _setActiveTab(tab);
      props.onActiveTabIdChange?.(tab?.id ?? null);
    },
    [props],
  );

  const setTabs = useCallback(
    (tabs: LabaratoryTab[]) => {
      _setTabs(tabs);
      props.onTabsChange?.(tabs);
    },
    [props],
  );

  const addTab = useCallback(
    (tab: Omit<LabaratoryTab, 'id'>) => {
      const newTab = { ...tab, id: crypto.randomUUID() } as LabaratoryTab;
      const newTabs = [...(tabs ?? []), newTab] as LabaratoryTab[];
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
    (id: string, newData: LabaratoryTabData) => {
      const newTabs = tabs.map(t => (t.id === id ? { ...t, data: newData } : t)) as LabaratoryTab[];
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
