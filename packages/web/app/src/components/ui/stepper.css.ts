import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import { focusRing } from './primitives/shared-styles';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const stepperStyles = {
  list: recipe({
    base: component({
      display: 'flex',
      gap: space(2),
    }),
    variants: {
      variant: {
        horizontal: component({
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }),
        vertical: component({ flexDirection: 'column' }),
        circle: component({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }),
      },
    },
  }),
  separator: recipe({
    base: component({
      backgroundColor: vars.color.line.subtle,
      transitionProperty: 'all',
      transitionDuration: '300ms',
      transitionTimingFunction: vars.ease.inOut,
      selectors: {
        '&[data-disabled]': { opacity: '50%' },
        '&[data-state="completed"]': { backgroundColor: vars.color.fg.default },
      },
    }),
    variants: {
      orientation: {
        horizontal: component({
          height: space(0.5),
          flex: '1',
        }),
        vertical: component({
          height: '100%',
          width: space(0.5),
        }),
      },
      labelOrientation: {
        vertical: component({
          position: 'absolute',
          top: space(5),
          right: 'calc(-50% + 20px)',
          left: 'calc(50% + 30px)',
          display: 'block',
          flexShrink: '0',
        }),
      },
    },
  }),
  // The step row; its layout follows the `data-variant` and `data-label-orientation` attributes.
  step: style(
    component({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: space(2),
      selectors: {
        '&[data-variant="vertical"]': { flexDirection: 'row' },
        '&[data-label-orientation="vertical"]': {
          width: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
        },
      },
    }),
  ),
  stepButton: recipe({
    base: [
      focusRing,
      component({
        display: 'inline-flex',
        ...square(9),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: vars.radius.full,
        fontSize: vars.text.sm,
        lineHeight: vars.text.smLineHeight,
        fontWeight: vars.weight.medium,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
      }),
    ],
    variants: {
      reached: {
        true: component({
          backgroundColor: vars.color.surface.selected,
          color: vars.color.fg.DEFAULT,
        }),
        false: component({
          backgroundColor: vars.color.surface.card,
          color: vars.color.fg.default,
        }),
      },
      static: {
        true: component({ cursor: 'default' }),
      },
    },
  }),
  stepText: style([shared.stack.base, component({ alignItems: 'flex-start' })]),
  verticalSeparator: style(
    component({
      display: 'flex',
      justifyContent: 'center',
      paddingInlineStart: space(5),
    }),
  ),
  verticalPanel: style(
    component({
      marginBlock: space(3),
      flex: '1',
      paddingInlineStart: space(4),
    }),
  ),
  // The circle variant: a progress ring beside the text.
  circleStep: style([
    shared.row.gap4,
    shared.noShrink,
    component({
      borderRadius: vars.radius.md,
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
  ]),
  circleStepText: style([shared.stack.gap1, component({ alignItems: 'flex-start' })]),
  controls: style(
    component({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: space(4),
    }),
  ),
  title: style([shared.text.base, shared.weight.medium]),
  description: style([shared.text.sm, shared.fg.secondary]),
  indicator: style([
    shared.relative,
    shared.inlineRow.base,
    component({ justifyContent: 'center' }),
  ]),
  indicatorFill: style(
    component({
      color: vars.color.fg.default,
      transitionProperty: 'all',
      transitionDuration: '300ms',
      transitionTimingFunction: vars.ease.inOut,
    }),
  ),
  indicatorLabel: style([
    shared.row.base,
    component({ position: 'absolute', inset: '0px', justifyContent: 'center' }),
  ]),
  indicatorText: style([shared.text.sm, shared.weight.medium]),
};
