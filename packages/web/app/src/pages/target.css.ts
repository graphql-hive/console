import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

const row = (rule = {}) =>
  style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      ...rule,
    }),
  );

export const targetStyles = {
  serviceUrl: style([shared.text.xs, shared.weight.normal, shared.fg.secondary]),
  serviceSchema: style(utility({ padding: space(2) })),
  schemaHeader: row({ marginBottom: space(5), justifyContent: 'space-between' }),
  schemaActions: row({ columnGap: space(4) }),
  header: row({ justifyContent: 'space-between', paddingBlock: space(6) }),
  separator: style(utility({ fontStyle: 'italic' })),
};
