import { forwardRef, type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { scrollAreaStyles } from './scroll-area.css';

const rootVariants = lenient(scrollAreaStyles.root);

const viewportVariants = lenient(scrollAreaStyles.viewport);

const scrollbarVariants = lenient(scrollAreaStyles.scrollbar);

const thumbVariants = lenient(scrollAreaStyles.thumb);

type ScrollAreaProps = {
  children: ReactNode;
  /** Which way the content can overflow. The other axis is clipped. */
  axis?: 'vertical' | 'horizontal' | 'both';
  height?: 'sm' | 'md' | 'lg';
  /** Scroll only once the content is taller than this. */
  maxHeight?: 'sm' | 'md' | 'lg' | 'screen';
  /** Take the remaining height of a flex column, for a panel that fills what is left of a page or a card. */
  fill?: boolean;
  'data-testid'?: string;
};

/**
 * The ref lands on the scrolling element, for code that reads or sets the scroll position (a
 * log pane that follows its tail).
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { children, axis = 'vertical', height, maxHeight, fill, 'data-testid': dataTestId },
  ref,
) {
  return (
    <BaseScrollArea.Root
      data-testid={dataTestId}
      className={rootVariants({ height, maxHeight, fill })}
    >
      <BaseScrollArea.Viewport ref={ref} className={viewportVariants({ axis })}>
        {/*
          Content sets an inline `min-width: fit-content`, which a wide table needs to get room to
          scroll into. On a vertical-only area it also stops a row of unbreakable text from ever
          truncating, and the list pushes its whole grid column wider instead.
        */}
        {axis === 'vertical' ? (
          children
        ) : (
          <BaseScrollArea.Content>{children}</BaseScrollArea.Content>
        )}
      </BaseScrollArea.Viewport>
      {axis !== 'horizontal' ? (
        <BaseScrollArea.Scrollbar
          orientation="vertical"
          className={scrollbarVariants({ orientation: 'vertical' })}
        >
          <BaseScrollArea.Thumb className={thumbVariants({ orientation: 'vertical' })} />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {axis !== 'vertical' ? (
        <BaseScrollArea.Scrollbar
          orientation="horizontal"
          className={scrollbarVariants({ orientation: 'horizontal' })}
        >
          <BaseScrollArea.Thumb className={thumbVariants({ orientation: 'horizontal' })} />
        </BaseScrollArea.Scrollbar>
      ) : null}
      {axis === 'both' ? <BaseScrollArea.Corner /> : null}
    </BaseScrollArea.Root>
  );
});
