import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const tasks = style({});

globalStyle(
  `:where(${tasks} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(3),
  }),
);

const taskBody = style(
  utility({
    display: 'flex',
    alignItems: 'flex-start',
  }),
);

globalStyle(
  `:where(${taskBody} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(3),
  }),
);

export const getStartedWizardStyles = {
  tasks,
  // A completed task fades back.
  task: recipe({
    base: utility({
      position: 'relative',
      display: 'block',
      borderRadius: vars.radius.lg,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.hover,
      padding: space(4),
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { backgroundColor: vars.color.surface.selected },
          },
        },
      },
    }),
    variants: {
      completed: { true: utility({ opacity: '70%' }) },
    },
  }),
  taskBody,
  taskIcon: style(utility({ ...square(5), color: vars.color.accent.DEFAULT })),
  taskText: style(
    utility({
      width: '0px',
      flex: '1',
    }),
  ),
  taskTitle: style([shared.weight.medium, shared.fg.strong, utility({ lineHeight: space(5) })]),
  taskDescription: style([shared.text.sm, shared.fg.secondary, utility({ marginTop: space(1) })]),
};
