import { InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import * as styles from './composition-errors-popover.css';

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
          <InfoIcon className={styles.compositionErrorsPopoverInfoIcon} />
        </Button>
      }
      openOnHover
      width="lg"
      content={
        <div>
          <p className={styles.compositionErrorsPopoverP}>
            If composition errors occur it is impossible to generate a supergraph and public API
            schema.
          </p>
          <p className={styles.compositionErrorsPopoverP2}>
            Composition errors can be caused by changes to the underlying subgraphs that causes
            conflicts with other subgraphs.
          </p>
        </div>
      }
    />
  );
}
