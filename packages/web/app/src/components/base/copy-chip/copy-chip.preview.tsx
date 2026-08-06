import { createPreview, NavPath } from 'react-foundry';
import { CopyChip } from './copy-chip';

export const nav: NavPath = 'Base/CopyChip';

export const Default = createPreview(() => (
  <div className="w-[44rem]">
    <CopyChip value="I like turtles" label="Click me to copy some text" />
  </div>
));
