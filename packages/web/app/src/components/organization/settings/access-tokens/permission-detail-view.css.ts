import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

const resources = style(utility({ width: '100%' }));

globalStyle(
  `:where(${resources} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

export const permissionDetailViewStyles = {
  groups: style(
    utility({
      display: 'flex',
      maxWidth: '800px',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      overflowX: 'auto',
      paddingLeft: space(2),
    }),
  ),
  group: style(
    utility({
      width: '50%',
      minWidth: '400px',
      paddingRight: space(12),
      paddingBottom: space(4),
    }),
  ),
  resources,
  resourceList: style(
    utility({
      display: 'flex',
      listStyleType: 'none',
      flexWrap: 'wrap',
      gap: space(1),
    }),
  ),
};
