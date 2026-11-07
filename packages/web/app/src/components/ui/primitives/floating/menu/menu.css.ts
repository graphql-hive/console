import { style } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { space, square } from '../../../../../styles/space';
import * as shared from '../../../../../styles/shared.css';
import { vars } from '../../../../../styles/theme.css';

export const menuStyles = {
  // The first row brings the panel's top inset itself; `menuPanelInset` covers the other sides.
  item: style(
    component({
      marginTop: space(0.5),
      gap: space(2.5),
      selectors: {
        '&:first-child': { marginTop: space(2) },
      },
    }),
  ),
  icon: style(component(square(4))),
  trailingIcon: style(component({ marginLeft: 'auto', ...square(4) })),
  navigationArrow: style(component({ marginLeft: space(1), ...square(3.5) })),
  tooltipTrigger: style(component({ display: 'block' })),
  indicator: style(
    component({
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
    }),
  ),
  indicatorIcon: style(component(square(3.5))),
  header: style([
    shared.stack.base,
    component({
      rowGap: space(1),
      paddingInline: space(2),
      paddingTop: space(3),
      paddingBottom: space(1),
    }),
  ]),
  headerTitle: style([
    shared.truncate,
    shared.weight.medium,
    shared.fg.strong,
    component({
      fontSize: vars.text.sm,
      lineHeight: '1',
    }),
  ]),
  headerSubtitle: style([
    shared.truncate,
    shared.fg.secondary,
    component({
      fontSize: vars.text.xs,
      lineHeight: '1',
    }),
  ]),
  submenuChevron: style(component({ marginLeft: 'auto', ...square(3.5) })),
  // z-index goes here, not on the popup: the positioner is transformed for placement, which makes
  // it a stacking context that would trap a z-index set inside it.
  positioner: style(
    component({
      zIndex: '50',
      outlineStyle: 'none',
    }),
  ),
  separator: style(
    component({
      marginBlock: space(2),
      height: '1px',
      backgroundColor: vars.color.line.DEFAULT,
    }),
  ),
  groupLabel: style(
    component({
      paddingInline: space(2),
      paddingTop: space(2),
      paddingBottom: space(1),
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      fontWeight: vars.weight.normal,
      color: vars.color.fg.muted,
    }),
  ),
};
