import { createPreview, type NavPath } from 'react-foundry';
import * as shared from '@/styles/shared.css';
import { RefreshButton } from './refresh-button';

export const nav: NavPath = 'Components/RefreshButton';

// The one Refresh control, as a filter row and a page header mount it.
export const Refresh = createPreview(() => (
  <div className={shared.row.gap4}>
    <RefreshButton onClick={() => {}} />
    <RefreshButton size="compact" onClick={() => {}} />
    <RefreshButton disabled onClick={() => {}} />
  </div>
));
