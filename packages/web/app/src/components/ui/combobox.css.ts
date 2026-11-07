import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

// react-select ships its own stylesheet, hence the `!important`s.
const roundedSurface = style(
  component({
    borderRadius: `${vars.radius.xl} !important`,
    backgroundColor: `${vars.color.surface.selected} !important`,
  }),
);

const mutedText = style(
  component({
    fontSize: `${vars.text.xs} !important`,
    lineHeight: `${vars.text.xsLineHeight} !important`,
    color: `${vars.color.fg.secondary} !important`,
  }),
);

export const comboboxStyles = {
  indicatorIcon: style(component(square(4))),
  emptyMessage: style([shared.text.xs, shared.fg.secondary]),
  control: style(
    component({
      borderColor: `${vars.color.line.DEFAULT} !important`,
      backgroundColor: `${vars.color.surface.selected} !important`,
      boxShadow: 'none !important',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { borderColor: `${vars.color.accent.DEFAULT} !important` },
          },
        },
      },
    }),
  ),
  valueContainer: roundedSurface,
  indicatorsContainer: roundedSurface,
  container: style(
    component({
      borderRadius: `${vars.radius.xl} !important`,
      backgroundColor: `${vars.color.surface.selected} !important`,
      fontSize: `${vars.text.sm} !important`,
      lineHeight: `${vars.text.smLineHeight} !important`,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important',
    }),
  ),
  menu: style(
    component({
      borderRadius: `${vars.radius.xl} !important`,
      backgroundColor: `${vars.color.surface.selected} !important`,
      fontSize: `${vars.text.xs} !important`,
      lineHeight: `${vars.text.xsLineHeight} !important`,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important',
    }),
  ),
  menuList: style(
    component({
      borderRadius: `${vars.radius.lg} !important`,
      backgroundColor: `${vars.color.surface.selected} !important`,
      fontSize: `${vars.text.xs} !important`,
      lineHeight: `${vars.text.xsLineHeight} !important`,
    }),
  ),
  option: style(
    component({
      cursor: 'pointer !important',
      backgroundColor: `${vars.color.surface.selected} !important`,
      fontSize: `${vars.text.xs} !important`,
      lineHeight: `${vars.text.xsLineHeight} !important`,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { backgroundColor: `${vars.color.surface.hover} !important` },
          },
        },
      },
    }),
  ),
  placeholder: mutedText,
  input: mutedText,
  multiValue: style(
    component({
      backgroundColor: `${vars.color.fg.secondary} !important`,
      fontSize: `${vars.text.xs} !important`,
      lineHeight: `${vars.text.xsLineHeight} !important`,
      fontWeight: `${vars.weight.bold} !important`,
      color: `${vars.color.fg.secondary} !important`,
    }),
  ),
  multiValueRemove: style(
    component({
      fontSize: `${vars.text.xs} !important`,
      lineHeight: `${vars.text.xsLineHeight} !important`,
      color: vars.color.fg.subtle,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              backgroundColor: `${vars.color.surface.inverse} !important`,
              color: `${vars.color.fg.inverse} !important`,
            },
          },
        },
      },
    }),
  ),
};
