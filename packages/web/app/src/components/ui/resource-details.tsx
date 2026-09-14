import { ReactElement } from 'react';
import { Info } from 'lucide-react';
import { Popover } from '@/components/base/floating/popover/popover';
import { InputCopy } from './input-copy';

/** Renders readonly properties for resources. Used on settings pages. */
export function ResourceDetails(props: { id: string; label: string }): ReactElement {
  return (
    <div className="flex items-center">
      <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 whitespace-nowrap rounded-md rounded-r-none border-y border-l px-3 py-2 text-sm">
        {props.label}
      </div>
      <InputCopy value={props.id} className="rounded-l-none" />
      <Popover
        trigger={
          <button type="button" aria-label="What this ID is for" className="text-neutral-10 ml-2">
            <Info className="size-4" />
          </button>
        }
        openOnHover
        width="md"
        content={
          <p className="text-neutral-11 text-pretty text-sm">
            This UUID can be used in API calls or CLI commands to Hive instead of passing the full
            resource path. I.e. "org/project/target".
          </p>
        }
      />
    </div>
  );
}
