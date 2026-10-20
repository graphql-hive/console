import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import * as styles from './composition-errors-popover.css';

export function CompositionErrorsPopover() {
  return (
    <Popover
      trigger={
        <button type="button" aria-label="About composition errors">
          <InfoIcon className={styles.compositionErrorsPopoverInfoIcon} />
        </button>
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
