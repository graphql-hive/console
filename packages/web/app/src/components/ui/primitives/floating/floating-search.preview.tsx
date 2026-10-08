import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { FloatingSearch } from './floating-search';

export const nav: NavPath = 'Primitives/Floating/Search';

const ITEMS = ['production', 'staging', 'development', 'preview', 'canary'];

/**
 * Normally rendered inside a floating popup, so it is shown here on a panel-like
 * surface rather than bare on the canvas.
 */
export const Default = createPreview(() => {
  const [search, setSearch] = useState('');
  const matches = ITEMS.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-64 rounded-md border border-line bg-neutral-2 px-2 pb-2 dark:border-line dark:bg-neutral-4">
      <FloatingSearch label="targets" value={search} onSearch={setSearch} />
      <div className="pt-2">
        {matches.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-fg-subtle italic">No matches</div>
        ) : (
          matches.map(item => (
            <div key={item} className="flex h-7 items-center px-2 text-control text-fg-secondary">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

/**
 * The `standalone` form, as the filter menu's text dimension renders it: the input is the whole
 * panel, and the panel is unpadded and scrolls. It should fill the panel with no scrollbar.
 */
export const Standalone = createPreview(() => {
  const [search, setSearch] = useState('');

  return (
    <div className="thin-scrollbar w-64 overflow-x-hidden overflow-y-auto rounded-md border border-line bg-neutral-2 dark:border-line dark:bg-neutral-4">
      <FloatingSearch
        label="fields"
        value={search}
        onSearch={setSearch}
        placeholder="Find field"
        standalone
      />
    </div>
  );
});

export const WithValue = createPreview(() => {
  const [search, setSearch] = useState('prod');

  return (
    <div className="thin-scrollbar w-64 overflow-x-hidden overflow-y-auto rounded-md border border-line bg-neutral-2 dark:border-line dark:bg-neutral-4">
      <FloatingSearch
        label="targets"
        value={search}
        onSearch={setSearch}
        placeholder="Find field"
        standalone
      />
    </div>
  );
});
