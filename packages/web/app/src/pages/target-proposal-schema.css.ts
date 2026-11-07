import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space } from '../styles/space';

export const targetProposalSchemaStyles = {
  root: style(
    utility({
      marginBottom: space(10),
      width: '100%',
    }),
  ),
  // Every service's schema stays mounted; only the chosen one shows.
  schema: recipe({
    variants: {
      hidden: { true: utility({ display: 'none' }) },
    },
  }),
};
