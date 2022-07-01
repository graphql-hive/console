import type { DocumentNode } from 'graphql';
import { stripIgnoredCharacters, parse } from 'graphql';
import axios from 'axios';
import type { HivePluginOptions } from './types';

export interface OperationsStore {
  canHandle(key: string): boolean;
  get(key: string): DocumentNode | null;
  load(): Promise<void>;
  reload(): Promise<void>;
}

export function createOperationsStore(pluginOptions: HivePluginOptions): OperationsStore {
  const operationsStoreOptions = pluginOptions.operationsStore;
  const token = pluginOptions.token;

  if (!operationsStoreOptions || pluginOptions.enabled === false) {
    return {
      canHandle() {
        return false;
      },
      get() {
        return null;
      },
      async load() {},
      async reload() {},
    };
  }

  const store = new Map<string, DocumentNode>();

  const canHandle: OperationsStore['canHandle'] = key => {
    return typeof key === 'string' && !key.includes('{');
  };

  const get: OperationsStore['get'] = key => {
    return store.get(key)!;
  };

  const load: OperationsStore['load'] = async () => {
    const response = await axios.post(
      operationsStoreOptions.endpoint ?? 'https://app.graphql-hive.com/graphql',
      {
        query,
        operationName: 'loadStoredOperations',
      },
      {
        responseType: 'json',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const parsedData: {
      data: {
        storedOperations: Array<{
          key: string;
          document: string;
        }>;
      };
    } = await response.data;

    store.clear();

    parsedData.data.storedOperations.forEach(({ key, document }) => {
      store.set(
        key,
        parse(document, {
          noLocation: true,
        })
      );
    });
  };

  const reload: OperationsStore['reload'] = load;

  return {
    canHandle,
    get,
    load,
    reload,
  };
}

const query = stripIgnoredCharacters(/* GraphQL */ `
  query loadStoredOperations {
    storedOperations {
      key: operationHash
      document: content
    }
  }
`);
