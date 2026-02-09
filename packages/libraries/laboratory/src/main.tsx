import ReactDOM from 'react-dom/client';
import { Laboratory } from './components/laboratory/laboratory';

const getLocalStorage = (key: string) => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

const setLocalStorage = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Laboratory
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
