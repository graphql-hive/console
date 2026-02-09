import { createContext, useContext } from "react";
import { IntrospectionQuery } from "graphql";
import {
  type LaboratoryCollection,
  type LaboratoryCollectionOperation,
  type LaboratoryCollectionsActions,
  type LaboratoryCollectionsState,
} from "@/lib/collections";
import {
  type LaboratoryEndpointActions,
  type LaboratoryEndpointState,
} from "@/lib/endpoint";
import type {
  LaboratoryEnv,
  LaboratoryEnvActions,
  LaboratoryEnvState,
} from "@/lib/env";
import type {
  LaboratoryHistory,
  LaboratoryHistoryActions,
  LaboratoryHistoryState,
} from "@/lib/history";
import {
  type LaboratoryOperation,
  type LaboratoryOperationsActions,
  type LaboratoryOperationsState,
} from "@/lib/operations";
import {
  LaboratoryPlugin,
  LaboratoryPluginsActions,
  LaboratoryPluginsState,
} from "@/lib/plugins";
import type {
  LaboratoryPreflight,
  LaboratoryPreflightActions,
  LaboratoryPreflightState,
} from "@/lib/preflight";
import type {
  LaboratorySettings,
  LaboratorySettingsActions,
  LaboratorySettingsState,
} from "@/lib/settings";
import type {
  LaboratoryTab,
  LaboratoryTabsActions,
  LaboratoryTabsState,
} from "@/lib/tabs";
import type {
  LaboratoryTest,
  LaboratoryTestActions,
  LaboratoryTestState,
} from "@/lib/tests";

type LaboratoryContextState = LaboratoryCollectionsState &
  LaboratoryEndpointState &
  LaboratoryOperationsState &
  LaboratoryHistoryState &
  LaboratoryTabsState &
  LaboratoryPreflightState &
  LaboratoryEnvState &
  LaboratorySettingsState &
  LaboratoryPluginsState &
  LaboratoryTestState & {
    isFullScreen?: boolean;
  };
type LaboratoryContextActions = LaboratoryCollectionsActions &
  LaboratoryEndpointActions &
  LaboratoryOperationsActions &
  LaboratoryHistoryActions &
  LaboratoryTabsActions &
  LaboratoryPreflightActions &
  LaboratoryEnvActions &
  LaboratorySettingsActions &
  LaboratoryPluginsActions &
  LaboratoryTestActions & {
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
      permission: `${keyof LaboratoryPermissions & string}:${keyof LaboratoryPermission & string}`
    ) => boolean;
  };

const LaboratoryContext = createContext<
  LaboratoryContextState & LaboratoryContextActions
>({} as LaboratoryContextState & LaboratoryContextActions);

export const useLaboratory = () => {
  return useContext(LaboratoryContext);
};

export interface LaboratoryPermission {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface LaboratoryPermissions {
  preflight?: Partial<LaboratoryPermission>;
  collections?: Partial<LaboratoryPermission>;
  collectionsOperations?: Partial<LaboratoryPermission>;
}

export interface LaboratoryApi {
  defaultEndpoint?: string | null;
  onEndpointChange?: (endpoint: string | null) => void;
  defaultSchemaIntrospection?: IntrospectionQuery | null;
  defaultCollections?: LaboratoryCollection[];
  onCollectionsChange?: (collections: LaboratoryCollection[]) => void;
  onCollectionCreate?: (collection: LaboratoryCollection) => void;
  onCollectionUpdate?: (collection: LaboratoryCollection) => void;
  onCollectionDelete?: (collection: LaboratoryCollection) => void;
  onCollectionOperationCreate?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation
  ) => void;
  onCollectionOperationUpdate?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation
  ) => void;
  onCollectionOperationDelete?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation
  ) => void;
  defaultOperations?: LaboratoryOperation[];
  defaultActiveOperationId?: string;
  onOperationsChange?: (operations: LaboratoryOperation[]) => void;
  onActiveOperationIdChange?: (operationId: string) => void;
  onOperationCreate?: (operation: LaboratoryOperation) => void;
  onOperationUpdate?: (operation: LaboratoryOperation) => void;
  onOperationDelete?: (operation: LaboratoryOperation) => void;
  defaultHistory?: LaboratoryHistory[];
  onHistoryChange?: (history: LaboratoryHistory[]) => void;
  onHistoryCreate?: (history: LaboratoryHistory) => void;
  onHistoryUpdate?: (history: LaboratoryHistory) => void;
  onHistoryDelete?: (history: LaboratoryHistory) => void;
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
  defaultPreflight?: LaboratoryPreflight | null;
  onPreflightChange?: (preflight: LaboratoryPreflight | null) => void;
  defaultTabs?: LaboratoryTab[];
  onTabsChange?: (tabs: LaboratoryTab[]) => void;
  defaultActiveTabId?: string | null;
  onActiveTabIdChange?: (tabId: string | null) => void;
  defaultEnv?: LaboratoryEnv | null;
  onEnvChange?: (env: LaboratoryEnv | null) => void;
  defaultSettings?: LaboratorySettings | null;
  onSettingsChange?: (settings: LaboratorySettings | null) => void;
  defaultTests?: LaboratoryTest[];
  onTestsChange?: (tests: LaboratoryTest[]) => void;
  permissions?: LaboratoryPermissions;
  checkPermissions?: (
    permission: `${keyof LaboratoryPermissions & string}:${keyof LaboratoryPermission & string}`
  ) => boolean;
  plugins?: LaboratoryPlugin<Record<string, any>>[];
  defaultPluginsState?: Record<string, any>;
  onPluginsStateChange?: (state: Record<string, any>) => void;
}

export type LaboratoryContextProps = LaboratoryContextState &
  LaboratoryContextActions &
  LaboratoryApi;

export const LaboratoryProvider = (
  props: React.PropsWithChildren<LaboratoryContextProps>
) => {
  return (
    <LaboratoryContext.Provider
      value={{
        ...props,
      }}
    >
      {props.children}
    </LaboratoryContext.Provider>
  );
};
