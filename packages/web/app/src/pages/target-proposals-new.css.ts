import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

export const targetProposalsNewStyles = {
  page: style(
    utility({
      display: 'flex',
      height: palette.layout.contentHeight,
      minHeight: '300px',
      flexDirection: 'column',
      paddingBottom: '0px',
    }),
  ),
  heading: style(
    utility({
      display: 'flex',
      paddingBlock: space(6),
    }),
  ),
  headingLink: style(utility({ color: vars.color.fg.DEFAULT })),
  headingSeparator: style(
    utility({
      display: 'inline-block',
      paddingInline: space(2),
      color: vars.color.fg.secondary,
      fontStyle: 'italic',
    }),
  ),
  error: style(utility({ marginInline: 'auto', width: '66.666667%' })),
  tabError: style(
    utility({
      marginBottom: space(6),
      width: '100%',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  ),
  noChanges: style(utility({ marginTop: space(8), textAlign: 'center' })),
  noChangesText: style(utility({ textAlign: 'center' })),
  service: style(utility({ marginBottom: space(6) })),
  serviceError: style([shared.row.base, shared.fg.critical]),
  serviceErrorIcon: style(utility({ marginRight: space(2), ...square(4) })),
  serviceEmpty: style(utility({ fontStyle: 'italic' })),
  overview: style(utility({ maxWidth: '600px' })),
  overviewSection: style(utility({ paddingBottom: space(10) })),
  overviewField: style(utility({ marginTop: space(2) })),
};
