import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphQLSchema } from "graphql";
import { createClient } from "graphql-ws";
import { decompressFromEncodedURIComponent } from "lz-string";
import {
  LaboratoryPermission,
  LaboratoryPermissions,
} from "@/components/laboratory/context";
import type {
  LaboratoryCollectionOperation,
  LaboratoryCollectionsActions,
  LaboratoryCollectionsState,
} from "@/lib/collections";
import type {
  LaboratoryEnv,
  LaboratoryEnvActions,
  LaboratoryEnvState,
} from "@/lib/env";
import {
  addArgToField,
  addPathToQuery,
  deletePathFromQuery,
  getOperationName,
  handleTemplate,
  removeArgFromField,
} from "@/lib/operations.utils";
import {
  LaboratoryPlugin,
  LaboratoryPluginsActions,
  LaboratoryPluginsState,
} from "@/lib/plugins";
import type {
  LaboratoryPreflightActions,
  LaboratoryPreflightState,
} from "@/lib/preflight";
import type {
  LaboratorySettingsActions,
  LaboratorySettingsState,
} from "@/lib/settings";
import type {
  LaboratoryTabOperation,
  LaboratoryTabsActions,
  LaboratoryTabsState,
} from "@/lib/tabs";

export interface LaboratoryOperation {
  id: string;
  name: string;
  query: string;
  variables: string;
  headers: string;
  extensions: string;
}

export interface LaboratoryOperationsState {
  operations: LaboratoryOperation[];
  activeOperation: LaboratoryOperation | null;
}

export interface LaboratoryOperationsActions {
  setActiveOperation: (operationId: string) => void;
  addOperation: (
    operation: Omit<LaboratoryOperation, "id"> & { id?: string }
  ) => LaboratoryOperation;
  setOperations: (operations: LaboratoryOperation[]) => void;
  updateActiveOperation: (
    operation: Partial<Omit<LaboratoryOperation, "id">>
  ) => void;
  deleteOperation: (operationId: string) => void;
  addPathToActiveOperation: (path: string) => void;
  deletePathFromActiveOperation: (path: string) => void;
  addArgToActiveOperation: (
    path: string,
    argName: string,
    schema: GraphQLSchema
  ) => void;
  deleteArgFromActiveOperation: (path: string, argName: string) => void;
  runActiveOperation: (
    endpoint: string,
    options?: {
      env?: LaboratoryEnv;
      headers?: Record<string, string>;
      onResponse?: (response: string) => void;
    }
  ) => Promise<Response | null>;
  stopActiveOperation: (() => void) | null;
  isActiveOperationLoading: boolean;
  isOperationLoading: (operationId: string) => boolean;
  isOperationSubscription: (operation: LaboratoryOperation) => boolean;
  isActiveOperationSubscription: boolean;
}

export interface LaboratoryOperationsCallbacks {
  onOperationCreate?: (operation: LaboratoryOperation) => void;
  onOperationUpdate?: (operation: LaboratoryOperation) => void;
  onOperationDelete?: (operation: LaboratoryOperation) => void;
}

export const useOperations = (
  props: {
    checkPermissions: (
      permission: `${keyof LaboratoryPermissions & string}:${keyof LaboratoryPermission & string}`
    ) => boolean;
    defaultOperations?: LaboratoryOperation[];
    defaultActiveOperationId?: string;
    onOperationsChange?: (operations: LaboratoryOperation[]) => void;
    onActiveOperationIdChange?: (operationId: string) => void;
    collectionsApi?: LaboratoryCollectionsState & LaboratoryCollectionsActions;
    tabsApi?: LaboratoryTabsState & LaboratoryTabsActions;
    envApi?: LaboratoryEnvState & LaboratoryEnvActions;
    preflightApi?: LaboratoryPreflightState & LaboratoryPreflightActions;
    settingsApi?: LaboratorySettingsState & LaboratorySettingsActions;
    pluginsApi?: LaboratoryPluginsState & LaboratoryPluginsActions;
  } & LaboratoryOperationsCallbacks
): LaboratoryOperationsState & LaboratoryOperationsActions => {
  // eslint-disable-next-line react/hook-use-state
  const [operations, _setOperations] = useState<LaboratoryOperation[]>(
    props.defaultOperations ?? []
  );

  const activeOperation = useMemo(() => {
    const tab = props.tabsApi?.activeTab;

    if (!tab) {
      return null;
    }

    if (tab.type === "operation") {
      return (
        operations.find(
          (o) => o.id === (tab.data as LaboratoryTabOperation).id
        ) ?? null
      );
    }

    return null;
  }, [props.tabsApi, operations]);

  const setActiveOperation = useCallback(
    (operationId: string) => {
      const tab =
        props.tabsApi?.tabs.find(
          (t) =>
            t.type === "operation" &&
            (t.data as LaboratoryTabOperation).id === operationId
        ) ?? null;

      if (!tab) {
        return;
      }

      props.tabsApi?.setActiveTab(tab);
    },
    [props.tabsApi]
  );

  const setOperations = useCallback(
    (operations: LaboratoryOperation[]) => {
      _setOperations(operations);
      props.onOperationsChange?.(operations);
    },
    [props]
  );

  const addOperation = useCallback(
    (operation: Omit<LaboratoryOperation, "id"> & { id?: string }) => {
      const newOperation = { id: crypto.randomUUID(), ...operation };
      const newOperations = [...operations, newOperation];
      _setOperations(newOperations);
      props.onOperationsChange?.(newOperations);

      props.onOperationCreate?.(newOperation);

      return newOperation;
    },
    [operations, props]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const share = urlParams.get("share");

    if (share) {
      const payload = decompressFromEncodedURIComponent(share);

      if (payload) {
        const { n, q, v, h, e } = JSON.parse(payload);

        const operation = addOperation({
          name: n,
          query: q,
          variables: v,
          headers: h,
          extensions: e,
        });

        const tab = props.tabsApi?.addTab({
          type: "operation",
          data: operation,
        });

        if (tab) {
          props.tabsApi?.setActiveTab(tab);
        }

        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete("share");
        window.history.replaceState(
          null,
          "",
          window.location.pathname + "?" + searchParams.toString()
        );
      }
    }
  }, []);

  const updateActiveOperation = useCallback(
    (operation: Partial<Omit<LaboratoryOperation, "id">>) => {
      const updatedOperation = { ...activeOperation, ...operation };

      if (updatedOperation.query) {
        const parsedName = getOperationName(updatedOperation.query);

        if (parsedName) {
          updatedOperation.name = parsedName;
        }
      }

      const newOperations = operations.map((o) =>
        o.id === activeOperation?.id
          ? (updatedOperation as LaboratoryOperation)
          : o
      );

      _setOperations(newOperations);

      props.onOperationsChange?.(newOperations);
      if (updatedOperation.id) {
        props.onOperationUpdate?.(updatedOperation as LaboratoryOperation);
      }

      if (
        props.collectionsApi &&
        props.checkPermissions?.("collectionsOperations:update") &&
        activeOperation?.id
      ) {
        const collectionId =
          props.collectionsApi.collections.find((c) =>
            c.operations.some((o) => o.id === activeOperation.id)
          )?.id ?? "";

        props.collectionsApi.updateOperationInCollection(
          collectionId,
          activeOperation.id,
          updatedOperation as LaboratoryCollectionOperation
        );
      }
    },
    [activeOperation, operations, props.checkPermissions, props.collectionsApi]
  );

  const deleteOperation = useCallback(
    (operationId: string) => {
      const operationToDelete = operations.find((o) => o.id === operationId);
      const newOperations = operations.filter((o) => o.id !== operationId);
      _setOperations(newOperations);

      props.onOperationsChange?.(newOperations);
      if (operationToDelete) {
        props.onOperationDelete?.(operationToDelete);
      }

      if (activeOperation?.id === operationId) {
        setActiveOperation(newOperations[0]?.id ?? "");
      }
    },
    [activeOperation, operations, props, setActiveOperation]
  );

  const addPathToActiveOperation = useCallback(
    (path: string) => {
      if (!activeOperation) {
        return;
      }
      const newActiveOperation = {
        ...activeOperation,
        query: addPathToQuery(activeOperation.query, path),
      };
      updateActiveOperation(newActiveOperation);
    },
    [activeOperation, updateActiveOperation]
  );

  const deletePathFromActiveOperation = useCallback(
    (path: string) => {
      if (!activeOperation?.query) {
        return;
      }

      const newActiveOperation = {
        ...activeOperation,
        query: deletePathFromQuery(activeOperation.query, path),
      };
      updateActiveOperation(newActiveOperation);
    },
    [activeOperation, updateActiveOperation]
  );

  const addArgToActiveOperation = useCallback(
    (path: string, argName: string, schema: GraphQLSchema) => {
      if (!activeOperation?.query) {
        return;
      }

      const newActiveOperation = {
        ...activeOperation,
        query: addArgToField(activeOperation.query, path, argName, schema),
      };
      updateActiveOperation(newActiveOperation);
    },
    [activeOperation, updateActiveOperation]
  );

  const deleteArgFromActiveOperation = useCallback(
    (path: string, argName: string) => {
      if (!activeOperation?.query) {
        return;
      }

      const newActiveOperation = {
        ...activeOperation,
        query: removeArgFromField(activeOperation.query, path, argName),
      };
      updateActiveOperation(newActiveOperation);
    },
    [activeOperation, updateActiveOperation]
  );

  const [stopOperationsFunctions, setStopOperationsFunctions] = useState<
    Record<string, () => void>
  >({});

  const isOperationLoading = useCallback(
    (operationId: string) => {
      return Object.keys(stopOperationsFunctions).includes(operationId);
    },
    [stopOperationsFunctions]
  );

  const isActiveOperationLoading = useMemo(() => {
    return activeOperation ? isOperationLoading(activeOperation.id) : false;
  }, [activeOperation, isOperationLoading]);

  const runActiveOperation = useCallback(
    async (
      endpoint: string,
      options?: {
        env?: LaboratoryEnv;
        headers?: Record<string, string>;
        onResponse?: (response: string) => void;
      },
      plugins: LaboratoryPlugin[] = props.pluginsApi?.plugins ?? [],
      pluginsState: Record<string, any> = props.pluginsApi?.pluginsState ?? {}
    ) => {
      if (!activeOperation?.query) {
        return null;
      }

      let env: LaboratoryEnv;
      let headers: Record<string, string>;

      if (options?.env) {
        env = options.env;
        headers = options.headers ?? {};
      } else {
        const preflightResult = await props.preflightApi?.runPreflight?.(
          plugins,
          pluginsState
        );
        env = preflightResult?.env ?? { variables: {} };
        headers = preflightResult?.headers ?? {};
        pluginsState = preflightResult?.pluginsState ?? {};
        props.pluginsApi?.setPluginsState(pluginsState);
      }

      if (env && Object.keys(env?.variables ?? {}).length > 0) {
        props.envApi?.setEnv(env);
      } else {
        env = props.envApi?.env ?? { variables: {} };
      }

      const parsedHeaders = activeOperation.headers
        ? JSON.parse(
            handleTemplate(activeOperation.headers, {
              ...env.variables,
              plugins: pluginsState,
            })
          )
        : {};

      const mergedHeaders = {
        ...headers,
        ...parsedHeaders,
      };

      const variables = activeOperation.variables
        ? JSON.parse(
            handleTemplate(activeOperation.variables, {
              ...env.variables,
              plugins: pluginsState,
            })
          )
        : {};
      const extensions = activeOperation.extensions
        ? JSON.parse(
            handleTemplate(activeOperation.extensions, {
              ...env.variables,
              plugins: pluginsState,
            })
          )
        : {};

      if (activeOperation.query.startsWith("subscription")) {
        const client = createClient({
          url: endpoint.replace("http", "ws"),
          connectionParams: {
            ...mergedHeaders,
          },
        });

        client.on("connected", () => {
          console.log("connected");
        });

        client.on("error", () => {
          setStopOperationsFunctions((prev) => {
            const newStopOperationsFunctions = { ...prev };
            delete newStopOperationsFunctions[activeOperation.id];
            return newStopOperationsFunctions;
          });
        });

        client.on("closed", () => {
          setStopOperationsFunctions((prev) => {
            const newStopOperationsFunctions = { ...prev };
            delete newStopOperationsFunctions[activeOperation.id];
            return newStopOperationsFunctions;
          });
        });

        client.subscribe(
          {
            query: activeOperation.query,
            variables,
            extensions,
          },
          {
            next: (message) => {
              options?.onResponse?.(JSON.stringify(message ?? {}));
            },
            error: () => {},
            complete: () => {},
          }
        );

        setStopOperationsFunctions((prev) => ({
          ...prev,
          [activeOperation.id]: () => {
            void client.dispose();
            setStopOperationsFunctions((prev) => {
              const newStopOperationsFunctions = { ...prev };
              delete newStopOperationsFunctions[activeOperation.id];
              return newStopOperationsFunctions;
            });
          },
        }));

        return Promise.resolve(new Response());
      }

      const abortController = new AbortController();

      const response = fetch(endpoint, {
        method: "POST",
        credentials: props.settingsApi?.settings.fetch.credentials,
        body: JSON.stringify({
          query: activeOperation.query,
          variables,
          extensions,
        }),
        headers: {
          ...mergedHeaders,
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
      }).finally(() => {
        setStopOperationsFunctions((prev) => {
          const newStopOperationsFunctions = { ...prev };
          delete newStopOperationsFunctions[activeOperation.id];

          return newStopOperationsFunctions;
        });
      });

      setStopOperationsFunctions((prev) => ({
        ...prev,
        [activeOperation.id]: () => abortController.abort(),
      }));

      return response;
    },
    [activeOperation, props.preflightApi, props.envApi, props.pluginsApi]
  );

  const isOperationSubscription = useCallback(
    (operation: LaboratoryOperation) => {
      return operation.query?.startsWith("subscription") ?? false;
    },
    []
  );

  const isActiveOperationSubscription = useMemo(() => {
    return activeOperation ? isOperationSubscription(activeOperation) : false;
  }, [activeOperation, isOperationSubscription]);

  return {
    operations,
    setOperations,
    runActiveOperation,
    setActiveOperation,
    activeOperation,
    addOperation,
    updateActiveOperation,
    deleteOperation,
    addPathToActiveOperation,
    deletePathFromActiveOperation,
    addArgToActiveOperation,
    deleteArgFromActiveOperation,
    isActiveOperationLoading,
    stopActiveOperation: stopOperationsFunctions[activeOperation?.id ?? ""],
    isActiveOperationSubscription,
    isOperationSubscription,
    isOperationLoading,
  };
};
