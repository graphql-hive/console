import React from 'react';
import ReactDOM from 'react-dom/client';
import { Laboratory } from './components/laboratory/laboratory';

export * from './components/laboratory/laboratory';
export * from './components/laboratory/context';
export * from './components/laboratory/editor';
export * from './components/ui/dialog';
export * from './components/ui/tabs';
export * from './lib/endpoint';
export * from './lib/collections';
export * from './lib/env';
export * from './lib/history';
export * from './lib/operations';
export * from './lib/preflight';
export * from './lib/settings';
export * from './lib/tabs';
export * from './lib/tests';
export * from './lib/plugins';

export const renderLaboratory = (el: HTMLElement) => {
  const prefix = 'hive-laboratory';

  const getLocalStorage = (key: string) => {
    const value = localStorage.getItem(`${prefix}:${key}`);
    return value ? JSON.parse(value) : null;
  };

  const setLocalStorage = (key: string, value: unknown) => {
    localStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
  };

  if (!el) {
    throw new Error('Laboratory element not found');
  }

  return ReactDOM.createRoot(el).render(
    <Laboratory
      theme="dark"
      defaultEndpoint={getLocalStorage('endpoint') ?? null}
      onEndpointChange={endpoint => {
        setLocalStorage('endpoint', endpoint ?? '');
      }}
      defaultCollections={getLocalStorage('collections') ?? []}
      onCollectionsChange={collections => {
        setLocalStorage('collections', collections);
      }}
      defaultTabs={getLocalStorage('tabs') ?? []}
      onTabsChange={tabs => {
        setLocalStorage('tabs', tabs);
      }}
      defaultOperations={getLocalStorage('operations') ?? []}
      onOperationsChange={operations => {
        setLocalStorage('operations', operations);
      }}
      defaultActiveTabId={getLocalStorage('activeTabId') ?? null}
      onActiveTabIdChange={activeTabId => {
        setLocalStorage('activeTabId', activeTabId ?? '');
      }}
      defaultPreflight={getLocalStorage('preflight') ?? null}
      onPreflightChange={preflight => {
        setLocalStorage('preflight', preflight ?? '');
      }}
      defaultEnv={getLocalStorage('env') ?? null}
      onEnvChange={env => {
        setLocalStorage('env', env ?? '');
      }}
      defaultSettings={getLocalStorage('settings') ?? null}
      onSettingsChange={settings => {
        setLocalStorage('settings', settings ?? '');
      }}
      defaultHistory={getLocalStorage('history') ?? []}
      onHistoryChange={history => {
        setLocalStorage('history', history);
      }}
    />,
  );
};
