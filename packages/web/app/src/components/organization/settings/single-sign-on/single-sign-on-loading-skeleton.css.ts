import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

const spaced = (gap: number) => {
  const root = style({});
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

export const singleSignOnLoadingSkeletonStyles = {
  section: spaced(8),
  rows: spaced(3),
  row: style(
    utility({
      display: 'flex',
      gap: space(8),
    }),
  ),
  // A placeholder line, keyed by its width in spacing steps.
  line: styleVariants({
    24: utility({ display: 'flex', width: space(24) }),
    36: utility({ display: 'flex', width: space(36) }),
    40: utility({ display: 'flex', width: space(40) }),
    44: utility({ display: 'flex', width: space(44) }),
    72: utility({ display: 'flex', width: space(72) }),
    80: utility({ display: 'flex', width: space(80) }),
    96: utility({ display: 'flex', width: space(96) }),
  }),
  // A setting row: text on the left, a switch-sized block on the right.
  setting: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    }),
  ),
  settingText: spaced(2),
  settingToggle: style(
    utility({
      display: 'block',
      height: space(6),
      width: space(11),
    }),
  ),
};
