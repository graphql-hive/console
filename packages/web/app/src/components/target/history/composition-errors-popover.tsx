import { InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { compositionErrorsPopoverStyles } from './composition-errors-popover.css';

export function CompositionErrorsPopover() {
  return (
    <Popover
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="About composition errors"
          data-testid="composition-errors-info"
        >
          <InfoIcon className={compositionErrorsPopoverStyles.icon} />
        </Button>
      }
      openOnHover
      width="lg"
      content={
        <div>
          <p className={compositionErrorsPopoverStyles.text}>
            If composition errors occur it is impossible to generate a supergraph and public API
            schema.
          </p>
          <p className={compositionErrorsPopoverStyles.textSpaced}>
            Composition errors can be caused by changes to the underlying subgraphs that causes
            conflicts with other subgraphs.
          </p>
        </div>
      }
    />
  );
}
