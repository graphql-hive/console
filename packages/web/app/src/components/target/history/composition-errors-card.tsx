import { XCircleIcon } from 'lucide-react';
import { FragmentType, useFragment } from '@/gql';
import { CompositionErrorMessage } from './composition-error-message';
import { CompositionErrorsPopover } from './composition-errors-popover';
import { CompositionErrorsSection_SchemaErrorConnection } from './errors-and-changes';
import { compositionErrorsCardStyles } from './composition-errors-card.css';

export function CompositionErrorsCard(props: {
  compositionErrors: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
}) {
  const compositionErrors = useFragment(
    CompositionErrorsSection_SchemaErrorConnection,
    props.compositionErrors,
  );

  return (
    <div className={compositionErrorsCardStyles.root}>
      <div className={compositionErrorsCardStyles.header}>
        <div className={compositionErrorsCardStyles.headerIcon}>
          <XCircleIcon className={compositionErrorsCardStyles.icon} />
        </div>

        <div className={compositionErrorsCardStyles.headerText}>
          <h3 className={compositionErrorsCardStyles.title}>Supergraph not composable</h3>
          <p className={compositionErrorsCardStyles.description}>
            Errors occurred while attempting to compose the supergraph from its subgraphs.
          </p>
        </div>

        <span className={compositionErrorsCardStyles.count}>
          <span className={compositionErrorsCardStyles.countDot} />
          {compositionErrors.edges.length} error
          {compositionErrors.edges.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={compositionErrorsCardStyles.listHeader}>
        <span className={compositionErrorsCardStyles.listTitle}>Composition errors</span>
        <CompositionErrorsPopover />
      </div>

      <ul className={compositionErrorsCardStyles.errors}>
        {compositionErrors.edges.map((err, idx) => (
          <li key={idx} className={compositionErrorsCardStyles.error}>
            <span className={compositionErrorsCardStyles.errorIndex}>
              {String(idx + 1).padStart(2, '0')}
            </span>

            <CompositionErrorMessage message={err.node.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}
