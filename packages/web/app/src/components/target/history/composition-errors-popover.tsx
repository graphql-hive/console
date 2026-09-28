import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/base/floating/popover/popover';

export function CompositionErrorsPopover() {
  return (
    <Popover
      trigger={
        <button type="button" aria-label="About composition errors">
          <InfoIcon className="h-3 w-3" />
        </button>
      }
      openOnHover
      width="lg"
      content={
        <div>
          <p className="text-fg-default text-xs">
            If composition errors occur it is impossible to generate a supergraph and public API
            schema.
          </p>
          <p className="text-fg-default mt-2 text-xs">
            Composition errors can be caused by changes to the underlying subgraphs that causes
            conflicts with other subgraphs.
          </p>
        </div>
      }
    />
  );
}
