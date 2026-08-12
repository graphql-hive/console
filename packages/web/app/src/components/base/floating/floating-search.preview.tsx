import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { FloatingSearch } from './floating-search';

export const nav: NavPath = 'Base/Floating/Search';

const ITEMS = ['production', 'staging', 'development', 'preview', 'canary'];

/**
 * Normally rendered inside a floating popup, so it is shown here on a panel-like
 * surface rather than bare on the canvas.
 */
export const Default = createPreview(() => {
  const [search, setSearch] = useState('');
  const matches = ITEMS.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-neutral-2 border-neutral-5 dark:bg-neutral-4 dark:border-neutral-5 w-64 rounded-md border px-2 pb-2">
      <FloatingSearch label="targets" value={search} onSearch={setSearch} />
      <div className="pt-2">
        {matches.length === 0 ? (
          <div className="text-neutral-8 px-2 py-4 text-center text-sm italic">No matches</div>
        ) : (
          matches.map(item => (
            <div key={item} className="text-neutral-10 flex h-7 items-center px-2 text-[13px]">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export const WithValue = createPreview(() => {
  const [search, setSearch] = useState('prod');

  return (
    <div className="bg-neutral-2 border-neutral-5 dark:bg-neutral-4 dark:border-neutral-5 w-64 rounded-md border px-2 pb-2">
      <FloatingSearch label="targets" value={search} onSearch={setSearch} />
    </div>
  );
});
