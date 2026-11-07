import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { DataTableCursorPagination } from '@/components/ui/data-table/data-table-pagination';
import { Button } from '../button/button';
import { Spinner } from './spinner';
import * as styles from './spinner.preview.css';

export const nav: NavPath = 'Primitives/Spinner';

export const Sizes = createPreview(() => (
  <div className={styles.div}>
    <span className={styles.span}>
      <Spinner variants={{ size: 'sm' }} />
      sm
    </span>
    <span className={styles.span}>
      <Spinner />
      default
    </span>
    <span className={styles.span}>
      <Spinner variants={{ size: 'lg' }} />
      lg
    </span>
  </div>
));

export const InContext = createPreview(() => (
  <div className={styles.div2}>
    <div className={styles.div3}>
      <Spinner />
    </div>
    <DataTableCursorPagination
      loading
      summary="Showing 20 of 143 deployments"
      hasPreviousPage
      hasNextPage
      onPrevious={() => {}}
      onNext={() => {}}
    />
    <div className={styles.div4}>
      <Spinner />
      <div className={styles.div5}>Loading app deployments</div>
    </div>
  </div>
));

export const InButton = createPreview(() => (
  <div className={styles.div6}>
    <Button>
      <Spinner variants={{ size: 'sm', tone: 'current' }} />
      Creating...
    </Button>
    <Button variant="outline">
      <Spinner variants={{ size: 'sm', tone: 'current' }} />
      Save Changes
    </Button>
    <Button variant="primary">
      <Spinner variants={{ size: 'sm', tone: 'current' }} />
      Submit Proposal
    </Button>
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Spinner, {
    label: { type: 'text', default: 'Loading' },
    variants: {
      size: { type: 'radio', options: ['sm', 'default', 'lg'], default: 'default' },
      tone: { type: 'radio', options: ['accent', 'current'], default: 'accent' },
    },
  }),
  render: v => <Spinner label={v.label} variants={v.variants} />,
});
