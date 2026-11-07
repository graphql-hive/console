import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { cn } from '@/lib/utils';
import { FloatingSearch } from './floating-search';
import { floatingVariants, itemVariants } from './shared-styles';
import * as styles from './floating-search.preview.css';

export const nav: NavPath = 'Primitives/Floating/Search';

const ITEMS = ['production', 'staging', 'development', 'preview', 'canary'];

// Normally inside a floating popup, so each preview sits on the real panel classes.
export const Default = createPreview(() => {
  const [search, setSearch] = useState('');
  const matches = ITEMS.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={cn(floatingVariants({ padding: 'menu' }), styles.div)}>
      <FloatingSearch label="targets" value={search} onSearch={setSearch} />
      <div className={styles.div2}>
        {matches.length === 0 ? (
          <div className={styles.div3}>No matches</div>
        ) : (
          matches.map(item => (
            <div key={item} className={itemVariants()}>
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
    <div className={cn(floatingVariants({ padding: 'none' }), styles.div)}>
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
    <div className={cn(floatingVariants({ padding: 'none' }), styles.div)}>
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
