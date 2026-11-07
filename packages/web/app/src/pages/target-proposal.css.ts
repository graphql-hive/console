import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

export const targetProposalStyles = {
  page: style(
    utility({
      display: 'flex',
      height: palette.layout.contentHeight,
      minHeight: '300px',
      flexDirection: 'column',
      paddingBottom: '0px',
    }),
  ),
  centered: style(utility({ textAlign: 'center' })),
  header: style(
    utility({
      display: 'flex',
      paddingBlock: space(6),
    }),
  ),
  headerLink: style(utility({ color: vars.color.fg.DEFAULT })),
  headerSeparator: style(
    utility({
      display: 'inline-block',
      paddingInline: space(2),
      color: vars.color.fg.secondary,
      fontStyle: 'italic',
    }),
  ),
  headerSkeleton: style(
    utility({
      display: 'inline-flex',
      width: '150px',
      verticalAlign: 'middle',
    }),
  ),
  body: style([
    shared.stack.base,
    shared.fullWidth,
    shared.grow,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.inset,
      padding: space(4),
    }),
  ]),
  titleRow: style([
    shared.stack.gap2,
    utility({
      '@media': {
        '(width >= 40rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  title: style(
    utility({
      display: 'flex',
      flexGrow: '1',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
  ),
  failedIcon: style(utility({ color: vars.color.critical.DEFAULT })),
  passedIcon: style(utility({ color: vars.color.success.DEFAULT })),
  actions: style(
    utility({
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }),
  ),
  description: style(
    utility({
      marginTop: space(2),
      marginBottom: space(6),
    }),
  ),
  descriptionText: style(
    utility({
      width: '100%',
      borderLeftStyle: 'solid',
      borderLeftWidth: '2px',
      padding: space(4),
    }),
  ),
  meta: style([
    shared.text.xs,
    shared.fg.secondary,
    utility({ marginTop: space(4), paddingRight: space(2), textAlign: 'right' }),
  ]),
  tabs: style(
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  tabBody: style([
    shared.flex,
    shared.grow,
    utility({ flexDirection: 'row', paddingTop: space(4) }),
  ]),
};
