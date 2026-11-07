import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import { focusRing } from './primitives/shared-styles';
import { vars } from '../../styles/theme.css';

const months = style(
  component({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    '@media': {
      '(width >= 40rem)': { flexDirection: 'row' },
    },
  }),
);

globalStyle(
  `:where(${months} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
    '@media': {
      '(width >= 40rem)': {
        marginBlockStart: '0',
        marginBlockEnd: '0',
        marginInlineStart: '0',
        marginInlineEnd: space(4),
      },
    },
  }),
);

const month = style({});

globalStyle(
  `:where(${month} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

const monthGrid = style(
  component({
    width: '100%',
    borderCollapse: 'collapse',
  }),
);

globalStyle(
  `:where(${monthGrid} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

// Keyed like react-day-picker's class map where a key maps straight to a slot.
export const calendarStyles = {
  root: style(component({ padding: space(3) })),
  months,
  month,
  monthCaption: style(
    component({
      display: 'flex',
      height: space(7),
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ),
  captionLabel: style(
    component({
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      fontWeight: vars.weight.medium,
    }),
  ),
  // One nav for all months, laid over the caption row with a button at each outer edge.
  nav: style(
    component({
      position: 'absolute',
      insetInline: space(1),
      top: '0px',
      zIndex: '10',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
  ),
  navButton: style([
    focusRing,
    component({
      display: 'inline-flex',
      ...square(7),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: 'transparent',
      opacity: '50%',
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { opacity: '100%' },
          },
        },
      },
    }),
  ]),
  chevron: style(component(square(4))),
  monthGrid,
  weekdays: style(component({ display: 'flex' })),
  weekday: style(
    component({
      width: space(8),
      borderRadius: vars.radius.md,
      fontSize: vars.text.control,
      lineHeight: vars.text.controlLineHeight,
      fontWeight: vars.weight.normal,
      color: vars.color.fg.secondary,
    }),
  ),
  week: style(
    component({
      marginTop: space(2),
      display: 'flex',
      width: '100%',
    }),
  ),
  // The cell carries aria-selected and the modifiers; the button inside is `dayButton`. A range
  // rounds only its outer corners; a single selection rounds the cell.
  day: recipe({
    base: component({
      position: 'relative',
      padding: '0px',
      textAlign: 'center',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      selectors: {
        '&:focus-within': {
          position: 'relative',
          zIndex: '20',
        },
        '&[aria-selected="true"]': { backgroundColor: vars.color.surface.selected },
      },
    }),
    variants: {
      mode: {
        range: component({
          selectors: {
            '&:first-child[aria-selected="true"]': {
              borderTopLeftRadius: vars.radius.md,
              borderBottomLeftRadius: vars.radius.md,
            },
            '&:last-child[aria-selected="true"]': {
              borderTopRightRadius: vars.radius.md,
              borderBottomRightRadius: vars.radius.md,
            },
          },
        }),
        single: component({
          selectors: {
            '&[aria-selected="true"]': { borderRadius: vars.radius.md },
          },
        }),
      },
    },
  }),
  // Later variants are emitted later and so win, as the v8 class map's precedence had it: a
  // range endpoint beats today, and a range middle beats the endpoint look.
  dayButton: recipe({
    base: [
      focusRing,
      component({
        display: 'inline-flex',
        ...square(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: vars.radius.sm,
        fontSize: vars.text.sm,
        lineHeight: vars.text.smLineHeight,
        fontWeight: vars.weight.normal,
        color: vars.color.fg.default,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
        '@media': {
          '(hover: hover)': {
            selectors: {
              '&:hover': { color: vars.color.fg.DEFAULT },
            },
          },
        },
      }),
    ],
    variants: {
      today: {
        true: component({
          backgroundColor: vars.color.surface.hover,
          color: vars.color.fg.DEFAULT,
        }),
      },
      selected: {
        true: component({
          backgroundColor: vars.color.surface.inverse,
          color: vars.color.fg.inverse,
          selectors: {
            '&:focus': {
              backgroundColor: vars.color.surface.inverse,
              color: vars.color.fg.inverse,
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  backgroundColor: vars.color.surface.inverse,
                  color: vars.color.fg.inverse,
                },
              },
            },
          },
        }),
      },
      rangeMiddle: {
        true: component({
          backgroundColor: vars.color.surface.selected,
          color: vars.color.fg.DEFAULT,
        }),
      },
    },
  }),
  rangeStart: style(
    component({
      borderTopLeftRadius: vars.radius.md,
      borderBottomLeftRadius: vars.radius.md,
    }),
  ),
  rangeEnd: style(
    component({
      borderTopRightRadius: vars.radius.md,
      borderBottomRightRadius: vars.radius.md,
    }),
  ),
  outside: style(
    component({
      color: vars.color.fg.secondary,
      opacity: '50%',
      selectors: {
        '&[aria-selected="true"]': {
          backgroundColor: vars.color.surface.stripe,
          opacity: '30%',
        },
      },
    }),
  ),
  disabled: style(
    component({
      color: vars.color.fg.secondary,
      opacity: '50%',
    }),
  ),
  hidden: style(component({ visibility: 'hidden' })),
};
