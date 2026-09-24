import { ReactElement } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { InputCopy } from './input-copy';

/** Renders readonly properties for resources. Used on settings pages. */
export function ResourceDetails(props: { id: string; label: string }): ReactElement {
  return (
    <div className="flex items-center">
      <InputCopy value={props.id} prefixText={props.label} />
      <Tooltip
        trigger={
          <button type="button" aria-label="What this ID is for" className="text-neutral-10 ml-2">
            <Info className="size-4" />
          </button>
        }
        maxWidth="md"
        content='This UUID can be used in API calls or CLI commands to Hive instead of passing the full resource path. I.e. "org/project/target".'
      />
    </div>
  );
}
