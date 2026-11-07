import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const changes = style(
  utility({
    listStylePosition: 'inside',
    listStyleType: 'disc',
    fontSize: vars.text.sm,
    lineHeight: vars.leading.relaxed,
  }),
);

globalStyle(
  `:where(${changes} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const changeDetailStyles = {
  root: style([
    shared.flex,
    shared.fullWidth,
    shared.fg.subtle,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
    }),
  ]),
  icon: style(
    utility({
      minWidth: 'fit-content',
      flexGrow: '1',
      paddingRight: space(2),
      '@media': {
        '(width >= 48rem)': { flex: 'none' },
      },
    }),
  ),
  block: style(utility({ marginTop: space(6) })),
  changes,
  breaking: style([
    shared.row.base,
    shared.fg.critical,
    utility({
      justifyContent: 'flex-end',
      paddingLeft: space(4),
    }),
  ]),
  unchanged: style([
    shared.row.base,
    shared.fg.secondary,
    utility({
      justifyContent: 'flex-end',
      paddingLeft: space(4),
    }),
  ]),
  markerIcon: style(utility({ marginRight: space(2), ...square(4) })),
  hintIcon: style(utility(square(3))),
  hintText: style([shared.text.sm, shared.weight.normal, shared.fg.default]),
};
