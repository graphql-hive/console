import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

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

export const targetAlertsDetailStyles = {
  centered: style([
    shared.row.base,
    shared.fill,
    utility({ height: 'fit-content', justifyContent: 'center', paddingBlock: space(28) }),
  ]),
  error: style([shared.text.sm, shared.fg.critical]),
  root: style(
    utility({
      display: 'flex',
      gap: space(8),
      paddingTop: space(7),
    }),
  ),
  main: spaced(6, { minWidth: '0px', flex: '1' }),
  aside: style(
    utility({
      position: 'sticky',
      top: space(6),
      width: space(94),
      flexShrink: '0',
      alignSelf: 'flex-start',
    }),
  ),
  logError: style([shared.text.sm, shared.fg.critical, utility({ paddingBlock: space(4) })]),
  logPending: style(
    utility({
      display: 'flex',
      justifyContent: 'center',
      paddingBlock: space(6),
    }),
  ),
  logSection: spaced(2),
  logTitle: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.strong,
    utility({ margin: '0px', marginBottom: space(2) }),
  ]),
  logHeading: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.strong,
    utility({ margin: '0px' }),
  ]),
};
