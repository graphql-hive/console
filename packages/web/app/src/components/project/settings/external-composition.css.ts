import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { animate } from '../../../styles/animations.css';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

// The endpoint check's state, shown as one icon.
export const externalCompositionStyles = {
  statusChecking: style(
    utility({
      ...square(5),
      animation: animate.spin,
      cursor: 'default',
      color: vars.color.fg.secondary,
    }),
  ),
  statusRetryIcon: style(utility(square(5))),
  statusFailed: style(
    utility({ ...square(5), cursor: 'default', color: vars.color.critical.DEFAULT }),
  ),
  statusOk: style(utility({ ...square(5), cursor: 'default', color: vars.color.success.DEFAULT })),
  root: style([
    shared.stack.base,
    utility({
      alignItems: 'flex-start',
      rowGap: space(6),
    }),
  ]),
  description: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ maxWidth: vars.container['2xl'] }),
  ]),
  header: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
    }),
  ),
};
