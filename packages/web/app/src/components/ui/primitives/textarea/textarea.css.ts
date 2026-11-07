import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { controlSurface } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';
import { field } from '../input/input.css';

export const textareaStyles = {
  root: recipe({
    base: [
      field,
      shared.text.sm,
      component({ width: '100%', paddingInline: space(3), paddingBlock: space(2) }),
    ],
    variants: {
      onSurface: {
        base: component({
          borderColor: vars.color.line.control,
          backgroundColor: vars.color.surface.control,
          selectors: {
            '&:focus': {
              borderColor: vars.color.neutral[7],
              backgroundColor: vars.color.neutral[1],
            },
            '&:where(.dark, .dark *):focus': { backgroundColor: vars.color.neutral[4] },
          },
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { borderColor: vars.color.line.strong } },
            },
          },
        }),
        raised: [
          controlSurface.raised,
          component({
            selectors: {
              '&:focus': { borderColor: vars.color.neutral[7] },
              '&:where(.dark, .dark *):focus': { backgroundColor: vars.color.neutral[6] },
            },
            '@media': {
              '(hover: hover)': {
                selectors: {
                  '&:hover': { borderColor: vars.color.line.strong },
                  '&:where(.dark, .dark *):hover': { borderColor: vars.color.neutral[7] },
                },
              },
            },
          }),
        ],
      },
      mono: {
        true: [shared.mono],
        false: {},
      },
      /** Grows with its text (`field-sizing`, set inline), so it must not be resizable by hand. */
      autoSize: {
        true: component({ resize: 'none' }),
        false: component({ minHeight: space(20), resize: 'vertical' }),
      },
    },
    defaultVariants: { onSurface: 'base', mono: false, autoSize: false },
  }),
};
