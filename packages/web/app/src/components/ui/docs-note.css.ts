import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const docsNoteStyles = {
  docsLink: style([
    shared.inlineRow.base,
    shared.text.sm,
    component({
      marginTop: space(2),
      padding: '0px',
      whiteSpace: 'pre-wrap',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.DEFAULT },
          },
        },
      },
    }),
  ]),
  productUpdatesLink: style([
    shared.inlineRow.base,
    shared.weight.medium,
    shared.fg.info,
    component({
      padding: '0px',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { textDecorationLine: 'underline' },
          },
        },
      },
    }),
  ]),
  leadingIcon: style(component({ marginRight: space(2), ...square(4) })),
  externalIcon: style(
    component({
      display: 'inline',
      ...square(4),
      paddingLeft: space(1),
    }),
  ),
};
