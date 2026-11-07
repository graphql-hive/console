import { XCircleIcon } from 'lucide-react';
import { FragmentType, useFragment } from '@/gql';
import { CompositionErrorMessage } from './composition-error-message';
import { CompositionErrorsPopover } from './composition-errors-popover';
import { CompositionErrorsSection_SchemaErrorConnection } from './errors-and-changes';
import * as styles from './composition-errors-card.css';

export function CompositionErrorsCard(props: {
  compositionErrors: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
}) {
  const compositionErrors = useFragment(
    CompositionErrorsSection_SchemaErrorConnection,
    props.compositionErrors,
  );

  return (
    <div className={styles.compositionErrorsCardDiv6}>
      <div className={styles.compositionErrorsCardDiv7}>
        <div className={styles.compositionErrorsCardDiv8}>
          <XCircleIcon className={styles.compositionErrorsCardXCircleIcon2} />
        </div>

        <div className={styles.compositionErrorsCardDiv9}>
          <h3 className={styles.compositionErrorsCardH32}>Supergraph not composable</h3>
          <p className={styles.compositionErrorsCardP2}>
            Errors occurred while attempting to compose the supergraph from its subgraphs.
          </p>
        </div>

        <span className={styles.compositionErrorsCardSpan5}>
          <span className={styles.compositionErrorsCardSpan6} />
          {compositionErrors.edges.length} error
          {compositionErrors.edges.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={styles.compositionErrorsCardDiv10}>
        <span className={styles.compositionErrorsCardSpan7}>Composition errors</span>
        <CompositionErrorsPopover />
      </div>

      <ul className={styles.compositionErrorsCardUl2}>
        {compositionErrors.edges.map((err, idx) => (
          <li key={idx} className={styles.compositionErrorsCardLi2}>
            <span className={styles.compositionErrorsCardSpan8}>
              {String(idx + 1).padStart(2, '0')}
            </span>

            <CompositionErrorMessage message={err.node.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}
