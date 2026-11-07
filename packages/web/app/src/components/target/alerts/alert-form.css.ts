import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const spaced = (gap: number, rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

const form = spaced(6, { minWidth: '0px' });

export const alertFormStyles = {
  // With the preview open the form and preview sit side by side.
  root: recipe({
    variants: {
      split: {
        true: utility({
          display: 'flex',
          gap: space(8),
        }),
      },
    },
  }),
  form: recipe({
    base: [form],
    variants: {
      split: {
        true: utility({ maxWidth: '700px' }),
        false: utility({ flex: '1' }),
      },
    },
  }),
  link: style(
    utility({
      color: vars.color.accent.DEFAULT,
      textDecorationLine: 'underline',
    }),
  ),
  conditions: spaced(4),
  removeIcon: style(utility(square(4))),
  addIcon: style(utility({ marginRight: space(1), ...square(3.5) })),
  fieldRow: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      gap: space(6),
    }),
  ),
  dot: style(utility({ ...square(2), borderRadius: vars.radius.full })),
  severityDot: styleVariants({
    info: utility({ backgroundColor: vars.color.info.DEFAULT }),
    warning: utility({ backgroundColor: vars.color.warning.DEFAULT }),
    critical: utility({ backgroundColor: vars.color.critical.DEFAULT }),
  }),
  channels: spaced(6),
  channelsHeader: style([shared.stack.gap2, utility({ alignItems: 'flex-start' })]),
  channelsRow: style(
    utility({
      display: 'flex',
      gap: space(6),
    }),
  ),
  channelsHint: style([shared.text.control, shared.fg.secondary]),
  channelFields: spaced(4),
  emphasis: style([shared.weight.medium, shared.fg.strong]),
  actions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: space(2),
    }),
  ),
  preview: style([
    shared.fillShrinkable,
    utility({
      position: 'sticky',
      top: space(6),
      alignSelf: 'flex-start',
    }),
  ]),
};
