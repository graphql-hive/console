import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

// Monaco mounts its own root inside these, so the surface is set on the child.
const monaco = style({});

globalStyle(`:is(${monaco} > *)`, utility({ backgroundColor: vars.color.editor }));

const monacoMini = style(utility({ height: space(32) }));

globalStyle(
  `:is(${monacoMini} > *)`,
  utility({
    borderRadius: vars.radius.md,
    backgroundColor: vars.color.editor,
  }),
);

const modal = style(
  utility({
    display: 'grid',
    height: '60vh',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
);

globalStyle(`${modal} section`, utility({ flexGrow: '1' }));

const icon = style(utility({ ...square(4), flexShrink: '0' }));

const iconLabel = style(
  utility({
    display: 'flex',
    alignItems: 'center',
    gap: space(1),
  }),
);

const editorTitle = {
  display: 'flex',
  alignItems: 'center',
  gap: space(2),
} as const;

export const graphiqlPluginStyles = {
  monaco,
  monacoMini,
  pluginIcon: style(
    utility({
      position: 'absolute',
      top: '1px',
      left: space(-5),
    }),
  ),
  editorTitle: style(
    utility({
      cursor: 'default',
      fontSize: vars.text.base,
      lineHeight: vars.text.baseLineHeight,
      fontWeight: vars.weight.semibold,
      letterSpacing: vars.tracking.tight,
    }),
  ),
  header: style([shared.row.gap4, utility({ justifyContent: 'space-between' })]),
  iconLabel,
  icon,
  toggle: style(utility({ marginTop: space(3) })),
  toggleIcon: style(utility({ marginRight: space(2), ...square(4) })),
  // The read-only preview of the script, with a notice over it while the preflight is off.
  previewTitle: style(utility({ ...editorTitle, marginTop: space(6), cursor: 'not-allowed' })),
  previewSubtitle: style(utility({ marginBottom: space(3), cursor: 'not-allowed' })),
  previewNotice: style([
    shared.row.base,
    shared.fg.strong,
    utility({
      position: 'absolute',
      inset: '0px',
      zIndex: '20',
      justifyContent: 'center',
      backgroundColor: vars.color.editorBackdrop,
      padding: space(4),
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          backgroundColor: `color-mix(in oklab, ${vars.color.editorBackdrop} 90%, transparent)`,
        },
      },
    }),
  ]),
  previewNoticeText: style([
    shared.text.sm,
    utility({
      borderRadius: vars.radius.md,
      backgroundColor: vars.color.editor,
      padding: space(4),
    }),
  ]),
  previewEditor: style(utility({ zIndex: '10' })),
  envTitle: style(utility({ ...editorTitle, marginTop: space(6) })),
  envSubtitle: style(utility({ marginBottom: space(3) })),
  modalNote: style([
    shared.row.gap2,
    shared.text.sm,
    shared.fg.default,
    utility({ marginInlineEnd: 'auto' }),
  ]),
  modal,
  modalEditor: style([shared.stack.base, utility({ marginRight: space(4) })]),
  modalPaneHeader: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
      padding: space(2),
    }),
  ),
  modalPaneTitle: style(
    utility({
      display: 'flex',
      gap: space(2),
    }),
  ),
  modalSide: style([shared.stack.base, utility({ height: 'inherit' })]),
  clearIcon: style(utility({ ...square(3), flexShrink: '0' })),
  console: style([
    shared.stack.base,
    utility({ height: '50%', backgroundColor: vars.color.editor }),
  ]),
  consoleLog: style(
    utility({
      paddingBlock: space(2.5),
      paddingRight: space(2.5),
      paddingLeft: '26px',
      fontFamily: vars.font.mono,
      fontSize: vars.text.xs,
      lineHeight: '18px',
    }),
  ),
  envHeader: style(
    utility({
      display: 'flex',
      gap: space(2),
      padding: space(2),
    }),
  ),
  logLevel: styleVariants({
    error: utility({ color: vars.color.critical.DEFAULT }),
    info: utility({ color: vars.color.success.DEFAULT }),
    warn: utility({ color: vars.color.warning.DEFAULT }),
    log: utility({ color: vars.color.fg.secondary }),
  }),
  logSeparator: style(
    utility({
      marginBlock: space(2),
      borderStyle: 'dashed',
      borderColor: 'currentcolor',
    }),
  ),
};
