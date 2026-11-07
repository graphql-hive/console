import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';

const s = layered.components;

const list = style({});

globalStyle(`:where(${list} > :not(:last-child))`, s({ marginBlockEnd: space(3.5) }));

export const descriptionListStyles = {
  list,
  row: recipe({
    variants: {
      columns: {
        fixed: s({ display: 'grid', gap: space(4) }),
        auto: s({ display: 'flex', flexWrap: 'wrap', columnGap: space(12), rowGap: space(3) }),
      },
    },
    defaultVariants: { columns: 'fixed' },
  }),
  /** A fixed row's grid, by how many items it holds. */
  columns: styleVariants({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }, n =>
    s({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }),
  ),
  cell: recipe({
    // A long value (a commit, an email) truncates or wraps instead of pushing the row.
    base: [shared.shrinkable],
    variants: {
      columns: {
        fixed: {},
        auto: s({ maxWidth: space(80) }),
      },
    },
    defaultVariants: { columns: 'fixed' },
  }),
  term: recipe({
    base: [shared.inlineRow.gap1, shared.fg.secondary, s({ marginBottom: space(1) })],
    variants: {
      termStyle: {
        label: [
          shared.weight.medium,
          s({ fontSize: 9, letterSpacing: '0.75px', textTransform: 'uppercase' }),
        ],
        title: [shared.text.xs, shared.weight.medium],
      },
    },
    defaultVariants: { termStyle: 'label' },
  }),
  termHint: style([shared.inlineFlex, shared.fg.muted]),
  termHintIcon: shared.icon.xs,
  value: recipe({
    base: [shared.text.control, shared.fg.strong],
    variants: {
      /** An identifier has no spaces to wrap at, so it breaks anywhere rather than overflowing. */
      mono: {
        true: [shared.mono, shared.breakAll],
      },
    },
  }),
};
