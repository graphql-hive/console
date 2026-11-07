import { style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const roleMappingPickerSheetStyles = {
  roleSection: style(utility({ paddingTop: space(2) })),
  resourcesSection: style(utility({ paddingTop: space(10) })),
  sectionTitle: style(
    utility({
      marginBottom: space(1),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  ),
  sectionHint: style([shared.text.sm, shared.fg.secondary, utility({ marginTop: space(2) })]),
};
