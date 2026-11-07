import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from './badge/badge';
import { Button } from './button/button';
import * as styles from './type-scale.preview.css';

export const nav: NavPath = 'Primitives/Foundations/TypeScale';

/**
 * The type scale: Tailwind's steps plus the two the app kept typing by hand. `control` (13px) is
 * the size of UI text: buttons, inputs, menus, chips, description lists, card bodies. `2xs`
 * (10px) is micro text: badges, subgraph chips, tick labels, mono timestamps. Both carry their
 * own line-height.
 */
const STEPS = [
  { name: '2xs', px: 10, lh: 14, cls: styles.stepsCls, use: 'badges, chips, tick labels' },
  {
    name: 'xs',
    px: 12,
    lh: 16,
    cls: styles.stepsCls2,
    use: 'secondary text, tooltips, descriptions',
  },
  { name: 'control', px: 13, lh: 18, cls: styles.stepsCls3, use: 'buttons, inputs, menus, chips' },
  { name: 'sm', px: 14, lh: 20, cls: styles.stepsCls4, use: 'body' },
  { name: 'base', px: 16, lh: 24, cls: styles.stepsCls5, use: 'lead paragraphs' },
  { name: 'lg', px: 18, lh: 28, cls: styles.stepsCls6, use: 'section headings' },
  { name: 'xl', px: 20, lh: 28, cls: styles.stepsCls7, use: 'page titles' },
  { name: '2xl', px: 24, lh: 32, cls: styles.stepsCls8, use: 'stat values' },
] as const;

const SAMPLE = 'Schema checks run on the composed API schema.';

export const Steps = createPreview(() => (
  <div className={styles.div}>
    {STEPS.map(step => (
      <div key={step.name} className={styles.div2}>
        <div className={styles.div3}>
          {step.name}
          <br />
          {step.px}/{step.lh}
        </div>
        <div>
          <div className={`${styles.div4} ${step.cls}`}>{SAMPLE}</div>
          <div className={styles.div5}>{step.use}</div>
        </div>
      </div>
    ))}
  </div>
));

/**
 * The three sizes that sit next to each other most often, on one control row: a compact chip
 * (control), its description (xs), and a badge (2xs).
 */
export const SideBySide = createPreview(() => (
  <div className={styles.div6}>
    <Button size="compact" label="Filter" />
    <span className={styles.span}>3 dimensions selected</span>
    <Badge content="BETA" variants={{ variant: 'secondary', size: 'sm' }} />
  </div>
));
