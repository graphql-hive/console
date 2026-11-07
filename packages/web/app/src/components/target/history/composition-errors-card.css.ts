import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const errors = style(
  utility({
    paddingInline: space(1),
    paddingBottom: space(2),
  }),
);

globalStyle(
  `:where(${errors} > :not(:last-child))`,
  utility({
    borderBottomStyle: 'solid',
    borderTopStyle: 'solid',
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
    borderColor: vars.color.critical.lineSubtle,
  }),
);

export const compositionErrorsCardStyles = {
  root: style(
    utility({
      overflow: 'hidden',
      borderRadius: vars.radius.xl,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.critical.line,
    }),
  ),
  header: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      gap: space(3),
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.critical.line,
      backgroundColor: vars.color.critical.tintSubtle,
      paddingInline: space(5),
      paddingBlock: space(4),
    }),
  ),
  headerIcon: style([
    shared.row.base,
    shared.noShrink,
    utility({
      marginTop: space(0.5),
      ...square(7),
      justifyContent: 'center',
      borderRadius: vars.radius.full,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.critical.line,
    }),
  ]),
  icon: style(utility({ ...square(4), color: vars.color.critical.DEFAULT })),
  headerText: style([shared.shrinkable, shared.fg.strong]),
  title: style([shared.text.sm, shared.weight.semibold]),
  description: style(
    utility({
      marginTop: space(0.5),
      fontSize: '12.5px',
    }),
  ),
  count: style([
    shared.inlineRow.base,
    shared.text['2xs'],
    shared.weight.semibold,
    shared.fg.criticalText,
    utility({
      marginLeft: 'auto',
      borderRadius: vars.radius.full,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.critical.line,
      backgroundColor: vars.color.critical.tint,
      paddingInline: space(2.5),
      paddingBlock: space(0.5),
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      selectors: {
        '&:focus': {
          boxShadow: `0 0 0 2px ${vars.color.accent.line}, 0 0 0 4px ${vars.color.accent.DEFAULT}`,
          outlineStyle: 'none',
        },
      },
    }),
  ]),
  countDot: style(
    utility({
      marginRight: space(1),
      ...square(1.5),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.critical.DEFAULT,
    }),
  ),
  listHeader: style([
    shared.row.gap2,
    shared.fg.strong,
    utility({
      paddingInline: space(5),
      paddingTop: space(4),
      paddingBottom: space(1),
    }),
  ]),
  listTitle: style([shared.text.sm, shared.weight.medium]),
  errors,
  error: style(
    utility({
      display: 'flex',
      gap: space(3),
      paddingInline: space(4),
      paddingBlock: space(3),
    }),
  ),
  errorIndex: style([
    shared.noShrink,
    shared.mono,
    shared.text.xs,
    shared.fg.critical,
    utility({
      marginTop: space(0.5),
      width: space(6),
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ]),
};
