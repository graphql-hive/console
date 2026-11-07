import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import { animate } from '../styles/animations.css';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

// Plain so the glow behind the link can key off `link:hover`.
const link = style([
  shared.relative,
  shared.row.base,
  shared.weight.medium,
  shared.fg.subtle,
  utility({
    isolation: 'isolate',
    flex: 'none',
    columnGap: space(3),
    borderRadius: vars.radius.lg,
    paddingInline: space(2),
    paddingBlock: space(0.5),
    fontSize: vars.text.control,
    lineHeight: space(6),
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    '@media': {
      '(hover: hover)': {
        selectors: { '&:hover': { color: vars.color.accent.DEFAULT } },
      },
    },
  }),
]);

const linkIcon = style(utility({ ...square(4), flex: 'none', color: vars.color.fg.secondary }));

const linkLabel = style(utility({ alignSelf: 'baseline', color: vars.color.fg.DEFAULT }));

export const authStyles = {
  link,
  linkGlow: style(
    utility({
      position: 'absolute',
      inset: '0px',
      zIndex: '-10',
      scale: '75% 75%',
      borderRadius: vars.radius.lg,
      backgroundColor: vars.color.surface.hover,
      opacity: '0%',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: { [`${link}:hover &`]: { scale: '100% 100%', opacity: '100%' } },
        },
      },
    }),
  ),
  linkIcon,
  linkLabel,
  root: style(
    utility({
      width: '100%',
      height: '100%',
    }),
  ),
  pending: style([shared.row.base, utility({ minHeight: '100vh', justifyContent: 'center' })]),
  pendingLogo: style(utility({ ...square(8), animation: animate.pulse })),
  layout: style(
    utility({
      display: 'grid',
      height: '100%',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      '@media': {
        '(width >= 48rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        '(width >= 64rem)': {
          maxWidth: 'none',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          paddingInline: '0px',
        },
      },
    }),
  ),
  // The intro panel, shown from the `lg` breakpoint up.
  intro: style([
    shared.relative,
    shared.hidden,
    shared.fg.strong,
    utility({
      height: '100%',
      flexDirection: 'column',
      borderRightStyle: 'solid',
      borderRightWidth: '1px',
      borderRightColor: vars.color.line.subtle,
      backgroundColor: vars.color.surface.card,
      padding: space(10),
      '@media': {
        '(width >= 64rem)': { display: 'flex' },
      },
    }),
  ]),
  introBackdrop: style(
    utility({
      position: 'absolute',
      inset: '0px',
      backgroundColor: vars.color.surface.inset,
    }),
  ),
  introBrand: style([
    shared.relative,
    shared.row.base,
    shared.text.lg,
    shared.weight.medium,
    utility({ zIndex: '20' }),
  ]),
  introLogo: style(utility({ marginRight: space(2), ...square(6) })),
  introBody: style([
    shared.relative,
    shared.flex,
    utility({
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
  introText: style(
    utility({
      maxWidth: vars.container.xs,
      '@media': {
        '(width >= 48rem)': { maxWidth: 'none' },
      },
    }),
  ),
  introTitle: style(
    utility({
      fontWeight: vars.weight.light,
      ...({ textWrap: 'balance' } as object),
      color: vars.color.fg.DEFAULT,
      '@media': {
        '(width >= 48rem)': { fontSize: vars.text['2xl'], lineHeight: vars.leading.tight },
        '(width >= 64rem)': { fontSize: vars.text['3xl'], lineHeight: vars.leading.tight },
      },
    }),
  ),
  introDescription: style(
    utility({
      marginTop: space(4),
      fontSize: vars.text.sm,
      lineHeight: space(6),
      ...({ textWrap: 'balance' } as object),
      color: vars.color.fg.default,
    }),
  ),
  introLinks: style(
    utility({
      marginTop: space(8),
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      columnGap: space(1),
      rowGap: space(3),
      '@media': {
        '(width >= 40rem)': { columnGap: space(2) },
        '(width >= 64rem)': { justifyContent: 'flex-start' },
      },
    }),
  ),
  form: style(utility({ gridColumn: 'span 2 / span 2' })),
};
