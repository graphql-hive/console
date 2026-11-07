import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { SingleSignOnLoadingSkeleton } from '@/components/organization/settings/single-sign-on/single-sign-on-loading-skeleton';
import { Skeleton } from './skeleton';
import * as styles from './skeleton.preview.css';

export const nav: NavPath = 'Primitives/Skeleton';

export const Shapes = createPreview(() => (
  <div className={styles.div}>
    <span className={styles.span}>
      <Skeleton />
      line
    </span>
    <span className={styles.span}>
      <span className={styles.span2}>
        <Skeleton variants={{ shape: 'block' }} />
      </span>
      block
    </span>
    <span className={styles.span3}>
      <Skeleton variants={{ shape: 'circle' }} />
      circle
    </span>
  </div>
));

export const LineSizes = createPreview(() => (
  <div className={styles.div2}>
    {(['xs', 'sm', 'default', 'lg', 'xl'] as const).map(size => (
      <span key={size} className={styles.span4}>
        <span className={styles.span5}>{size}</span>
        <Skeleton variants={{ size }} />
      </span>
    ))}
  </div>
));

export const LineWidths = createPreview(() => (
  <div className={styles.div3}>
    {(['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const).map(width => (
      <span key={width} className={styles.span4}>
        <span className={styles.span6}>{width}</span>
        <Skeleton variants={{ width }} />
      </span>
    ))}
  </div>
));

export const SettingsSections = createPreview(() => (
  <div className={styles.div4}>
    <SingleSignOnLoadingSkeleton />
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Skeleton, {
    variants: {
      shape: { type: 'radio', options: ['line', 'block', 'circle'], default: 'line' },
      size: { type: 'radio', options: ['xs', 'sm', 'default', 'lg', 'xl'], default: 'default' },
      width: { type: 'radio', options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'], default: 'md' },
    },
  }),
  render: v => (
    <span className={styles.span7}>
      <Skeleton variants={v.variants} />
    </span>
  ),
});
