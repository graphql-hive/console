import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const superGraphMetadataStyles = {
  metadataButton: style(utility({ marginBlock: '5px' })),
  metadataIcon: style(utility({ ...square(4), color: vars.color.fg.DEFAULT })),
  metadata: style([shared.text.xs, shared.fg.default]),
  chip: style(
    utility({
      marginBlock: space(0.5),
      marginLeft: space(1.5),
      display: 'inline-flex',
      height: space(6),
      maxWidth: space(24),
      cursor: 'pointer',
      alignItems: 'center',
      gap: space(1),
      borderRadius: vars.radius.full,
      paddingInline: space(2),
      fontSize: vars.text['2xs'],
      lineHeight: '1',
      fontWeight: vars.weight.normal,
    }),
  ),
  chipName: style([shared.shrinkable, shared.truncate]),
  chipIcon: style(utility({ flexShrink: '0' })),
  chipMarker: style([shared.noShrink, shared.weight.bold, utility({ fontSize: '8px' })]),
  list: style([
    shared.flex,
    shared.fullWidth,
    utility({
      justifyContent: 'flex-end',
      gap: space(1),
    }),
  ]),
  listMore: style([
    shared.row.base,
    shared.text.xs,
    shared.weight.bold,
    shared.fg.strong,
    utility({ paddingLeft: space(1) }),
  ]),
  listPopover: style([shared.text.xs, shared.fg.default]),
  listPopoverTitle: style(
    utility({
      marginBottom: space(2),
      fontWeight: vars.weight.bold,
    }),
  ),
  listPopoverBody: style(utility({ width: '250px' })),
  listPopoverChips: style(
    utility({
      display: 'flex',
      flexWrap: 'wrap',
      gap: space(1),
      paddingBlock: space(1),
    }),
  ),
};
