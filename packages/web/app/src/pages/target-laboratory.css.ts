import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

export const targetLaboratoryStyles = {
  // Anchors the unsaved-changes badge drawn by the `hive-badge-is-changed` global class.
  saveChanged: style(
    utility({
      position: 'relative',
      selectors: {
        '&::after': {
          content: '""',
          top: space(1),
        },
      },
    }),
  ),
  saveIcon: style(utility({ height: space(5) })),
  toolbar: style(
    utility({
      display: 'flex',
      paddingBlock: space(6),
    }),
  ),
  divider: style(
    utility({
      height: space(4),
      width: '1px',
      backgroundColor: vars.color.line.DEFAULT,
    }),
  ),
  unsavedDot: style(
    utility({
      marginLeft: space(1),
      ...square(2),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ),
  toolbarEnd: style([
    shared.stack.base,
    utility({ marginRight: '0px', marginLeft: 'auto', justifyContent: 'center' }),
  ]),
  queryLabelRow: style(utility({ alignSelf: 'flex-end', paddingTop: space(2) })),
  queryLabel: style([shared.text.xs, shared.weight.bold, utility({ marginRight: space(2) })]),
  fullScreen: style(
    utility({
      position: 'fixed',
      inset: '0px',
      backgroundColor: vars.color.editorBackdrop,
    }),
  ),
  fullScreenToggle: style([shared.row.gap2, shared.nowrap]),
  fullScreenIcon: style(utility(square(4))),
  page: style(
    utility({
      display: 'flex',
      height: palette.layout.contentHeight,
      flexDirection: 'column',
      paddingBottom: '0px',
    }),
  ),
  logs: style([
    shared.stack.base,
    shared.fullWidth,
    utility({ maxHeight: '200px', overflow: 'hidden', backgroundColor: vars.color.editorBackdrop }),
  ]),
  logsBody: style(
    utility({
      padding: space(4),
      fontFamily: vars.font.mono,
      fontSize: vars.text.xs,
      lineHeight: '18px',
    }),
  ),
  logsEmpty: style([
    shared.stack.base,
    shared.fg.secondary,
    utility({ alignItems: 'center', justifyContent: 'center' }),
  ]),
};
