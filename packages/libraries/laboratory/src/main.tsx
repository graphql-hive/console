import ReactDOM from 'react-dom/client';
import { devCollections } from '../dev/collections';
import { devActiveTabId, devOperations, devTabs } from '../dev/operations';
import { Laboratory } from './components/laboratory/laboratory';

/**
 * Dev harness. State is seeded from dev/ on every load and never persisted, so a
 * reload is always the same known state and edits to the seed files show up right
 * away. Persistence is the host's job, so there is nothing here for it to prove.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Laboratory
    enableDocs
    theme="dark"
    defaultEndpoint={`${window.location.origin}/graphql`}
    defaultCollections={devCollections}
    defaultOperations={devOperations}
    defaultTabs={devTabs}
    defaultActiveTabId={devActiveTabId}
  />,
);
