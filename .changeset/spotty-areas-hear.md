---
'@graphql-hive/render-laboratory': patch
---

Expand the options for renderLaboratory to allow all possible lab options instead of only GraphiQL
options"

This greatly expands how much customization can be done to Lab when `renderLaboratory` is programatically called. The new option argument is:

```
theme?: 'light' | 'dark';
defaultEndpoint?: string | null;
onEndpointChange?: (endpoint: string | null) => void;
defaultSchemaIntrospection?: IntrospectionQuery | null;
defaultCollections?: LaboratoryCollection[];
onCollectionsChange?: (collections: LaboratoryCollection[]) => void;
onCollectionCreate?: (collection: LaboratoryCollection) => void;
onCollectionUpdate?: (collection: LaboratoryCollection) => void;
onCollectionDelete?: (collection: LaboratoryCollection) => void;
onCollectionOperationCreate?: (collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => void;
onCollectionOperationUpdate?: (collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => void;
onCollectionOperationDelete?: (collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => void;
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
/** Show the full screen control. Off for hosts that already fill the viewport. */
enableFullScreen?: boolean;
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
checkPermissions?: (permission: `${keyof LaboratoryPermissions & string}:${keyof LaboratoryPermission & string}`) => boolean;
plugins?: LaboratoryPlugin<Record<string, any>>[];
defaultPluginsState?: Record<string, any>;
onPluginsStateChange?: (state: Record<string, any>) => void;
```
