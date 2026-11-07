import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const toolbarButton = style(
  utility({
    marginLeft: space(2),
    cursor: 'pointer',
    padding: space(1),
    '@media': {
      '(hover: hover)': {
        selectors: {
          '&:hover': { color: vars.color.accent.DEFAULT },
        },
      },
    },
  }),
);

export const editorStyles = {
  tabs: style([
    shared.flex,
    shared.grow,
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      paddingBottom: space(4),
      paddingLeft: space(2),
    }),
  ]),
  body: style(utility({ marginTop: space(4) })),
  changedDot: style(
    utility({
      marginLeft: space(-2),
      ...square(4),
      padding: space(1),
      color: vars.color.success.DEFAULT,
    }),
  ),
  unnamed: style(utility({ fontStyle: 'italic' })),
  errorIcon: style(utility({ ...square(4), color: vars.color.critical.DEFAULT })),
  close: style(utility({ marginLeft: space(2) })),
  // Only the active tab shows its close icon.
  closeIcon: recipe({
    base: utility(square(4)),
    variants: {
      hidden: {
        true: utility({ display: 'none' }),
      },
    },
  }),
  pane: style(
    utility({
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ),
  toolbar: style([
    shared.row.base,
    utility({
      justifyContent: 'flex-end',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      paddingInline: space(2),
      paddingBlock: space(1),
    }),
  ]),
  toolbarButton,
  toolbarIcon: style(utility(square(4))),
  settings: style([shared.stack.gap4, shared.text.sm]),
  settingsLabel: style(
    utility({
      marginBottom: space(2),
      fontWeight: vars.weight.semibold,
    }),
  ),
  settingsError: style([shared.text.xs, shared.fg.critical, utility({ marginTop: space(1) })]),
  serviceSelect: style([shared.flex, shared.grow, utility({ flexDirection: 'row' })]),
  serviceSelectLabel: style([
    shared.hidden,
    utility({
      '@media': {
        '(width >= 40rem)': { display: 'inline-block' },
      },
    }),
  ]),
};
