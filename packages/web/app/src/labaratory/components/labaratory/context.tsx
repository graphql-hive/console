import { createContext, useContext } from 'react';
import {
  type LabaratoryCollection,
  type LabaratoryCollectionOperation,
  type LabaratoryCollectionsActions,
  type LabaratoryCollectionsState,
} from '@/labaratory/lib/collections';
import {
  type LabaratoryEndpointActions,
  type LabaratoryEndpointState,
} from '@/labaratory/lib/endpoint';
import type { LabaratoryEnv, LabaratoryEnvActions, LabaratoryEnvState } from '@/labaratory/lib/env';
import type {
  LabaratoryHistory,
  LabaratoryHistoryActions,
  LabaratoryHistoryState,
} from '@/labaratory/lib/history';
import {
  type LabaratoryOperation,
  type LabaratoryOperationsActions,
  type LabaratoryOperationsState,
} from '@/labaratory/lib/operations';
import type {
  LabaratoryPreflight,
  LabaratoryPreflightActions,
  LabaratoryPreflightState,
} from '@/labaratory/lib/preflight';
import type {
  LabaratorySettings,
  LabaratorySettingsActions,
  LabaratorySettingsState,
} from '@/labaratory/lib/settings';
import type {
  LabaratoryTab,
  LabaratoryTabsActions,
  LabaratoryTabsState,
} from '@/labaratory/lib/tabs';
import type {
  LabaratoryTest,
  LabaratoryTestActions,
  LabaratoryTestState,
} from '@/labaratory/lib/tests';

type LabaratoryContextState = LabaratoryCollectionsState &
  LabaratoryEndpointState &
  LabaratoryOperationsState &
  LabaratoryHistoryState &
  LabaratoryTabsState &
  LabaratoryPreflightState &
  LabaratoryEnvState &
  LabaratorySettingsState &
  LabaratoryTestState & {
    isFullScreen?: boolean;
  };
type LabaratoryContextActions = LabaratoryCollectionsActions &
  LabaratoryEndpointActions &
  LabaratoryOperationsActions &
  LabaratoryHistoryActions &
  LabaratoryTabsActions &
  LabaratoryPreflightActions &
  LabaratoryEnvActions &
  LabaratorySettingsActions &
  LabaratoryTestActions & {
    openAddCollectionDialog?: () => void;
    openUpdateEndpointDialog?: () => void;
    openAddTestDialog?: () => void;
    openPreflightPromptModal?: (props: {
      placeholder: string;
      defaultValue?: string;
      onSubmit?: (value: string | null) => void;
    }) => void;
    goToFullScreen?: () => void;
    exitFullScreen?: () => void;
    checkPermissions?: (
      permission: `${keyof LabaratoryPermissions & string}:${keyof LabaratoryPermission & string}`,
    ) => boolean;
  };

const LabaratoryContext = createContext<LabaratoryContextState & LabaratoryContextActions>(
  {} as LabaratoryContextState & LabaratoryContextActions,
);

export const useLabaratory = () => {
  return useContext(LabaratoryContext);
};

export interface LabaratoryPermission {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface LabaratoryPermissions {
  preflight?: Partial<LabaratoryPermission>;
  collections?: Partial<LabaratoryPermission>;
  collectionsOperations?: Partial<LabaratoryPermission>;
}

export interface LabaratoryApi {
  defaultEndpoint?: string | null;
  onEndpointChange?: (endpoint: string | null) => void;
  defaultCollections?: LabaratoryCollection[];
  onCollectionsChange?: (collections: LabaratoryCollection[]) => void;
  onCollectionCreate?: (collection: LabaratoryCollection) => void;
  onCollectionUpdate?: (collection: LabaratoryCollection) => void;
  onCollectionDelete?: (collection: LabaratoryCollection) => void;
  onCollectionOperationCreate?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
  onCollectionOperationUpdate?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
  onCollectionOperationDelete?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
  defaultOperations?: LabaratoryOperation[];
  defaultActiveOperationId?: string;
  onOperationsChange?: (operations: LabaratoryOperation[]) => void;
  onActiveOperationIdChange?: (operationId: string) => void;
  onOperationCreate?: (operation: LabaratoryOperation) => void;
  onOperationUpdate?: (operation: LabaratoryOperation) => void;
  onOperationDelete?: (operation: LabaratoryOperation) => void;
  defaultHistory?: LabaratoryHistory[];
  onHistoryChange?: (history: LabaratoryHistory[]) => void;
  onHistoryCreate?: (history: LabaratoryHistory) => void;
  onHistoryUpdate?: (history: LabaratoryHistory) => void;
  onHistoryDelete?: (history: LabaratoryHistory) => void;
  openAddCollectionDialog?: () => void;
  openUpdateEndpointDialog?: () => void;
  openAddTestDialog?: () => void;
  openPreflightPromptModal?: (props: {
    placeholder: string;
    defaultValue?: string;
    onSubmit?: (value: string | null) => void;
  }) => void;
  isFullScreen?: boolean;
  goToFullScreen?: () => void;
  exitFullScreen?: () => void;
  defaultPreflight?: LabaratoryPreflight | null;
  onPreflightChange?: (preflight: LabaratoryPreflight | null) => void;
  defaultTabs?: LabaratoryTab[];
  onTabsChange?: (tabs: LabaratoryTab[]) => void;
  defaultActiveTabId?: string | null;
  onActiveTabIdChange?: (tabId: string | null) => void;
  defaultEnv?: LabaratoryEnv | null;
  onEnvChange?: (env: LabaratoryEnv | null) => void;
  defaultSettings?: LabaratorySettings | null;
  onSettingsChange?: (settings: LabaratorySettings | null) => void;
  defaultTests?: LabaratoryTest[];
  onTestsChange?: (tests: LabaratoryTest[]) => void;
  permissions?: LabaratoryPermissions;
  checkPermissions?: (
    permission: `${keyof LabaratoryPermissions & string}:${keyof LabaratoryPermission & string}`,
  ) => boolean;
}

export type LabaratoryContextProps = LabaratoryContextState &
  LabaratoryContextActions &
  LabaratoryApi;

export const LabaratoryProvider = (props: React.PropsWithChildren<LabaratoryContextProps>) => {
  return (
    <LabaratoryContext.Provider
      value={{
        ...props,
      }}
    >
      {props.children}
    </LabaratoryContext.Provider>
  );
};
