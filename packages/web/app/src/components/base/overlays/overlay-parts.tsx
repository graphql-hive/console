import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Button } from '../button/button';
import { ScrollArea } from '../scroll-area/scroll-area';

/**
 * The parts a dialog, a sheet and an alert dialog share, so the three read as one family: the
 * backdrop, the header and footer treatment, the scrolling body and the close button in the
 * corner. Base UI's alert dialog re-exports the dialog's title, description and close parts, so
 * these render inside either root.
 */

// Base UI sets `data-starting-style` on the frame a popup mounts and `data-ending-style` while it
// leaves, so one CSS transition covers both directions.
export const backdropClass =
  'bg-neutral-1_01 fixed inset-0 z-50 backdrop-blur-sm transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0';

export const popupSurfaceClass =
  'bg-neutral-3 border-neutral-5 text-neutral-12 z-50 flex flex-col gap-4 border shadow-lg outline-none';

export function OverlayHeader({
  title,
  description,
  clearCloseButton,
}: {
  title: ReactNode;
  /**
   * The accessible description, read out in full right after the title when the overlay opens.
   * One short passage of inline content; a second paragraph or a control belongs in the body.
   * It stays a `<p>` so block content inside it trips React's nesting warning in dev.
   */
  description?: ReactNode;
  /** Leave room on the right for the close button. */
  clearCloseButton: boolean;
}) {
  return (
    <div className={cn('flex shrink-0 flex-col gap-1.5 px-6 pt-6', clearCloseButton && 'pr-14')}>
      <BaseDialog.Title className="text-neutral-12 text-lg font-medium leading-none">
        {title}
      </BaseDialog.Title>
      {description != null ? (
        <BaseDialog.Description className="text-neutral-11 text-sm">
          {description}
        </BaseDialog.Description>
      ) : null}
    </div>
  );
}

export function OverlayBody({
  children,
  padding,
  padBottom,
}: {
  children: ReactNode;
  /** `none` for content that lays itself out edge to edge, such as a list or a code editor. */
  padding: 'default' | 'none';
  /** When nothing follows the body, it carries the bottom inset itself. */
  padBottom: boolean;
}) {
  return (
    <ScrollArea fill>
      <div className={cn(padding === 'default' && 'px-6', padBottom && 'pb-6')}>{children}</div>
    </ScrollArea>
  );
}

export function OverlayFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function OverlayCloseButton() {
  return (
    <span className="absolute right-4 top-4">
      <BaseDialog.Close
        render={
          <Button layout="iconOnly" icon={X} aria-label="Close" variant="ghost" size="icon-sm" />
        }
      />
    </span>
  );
}
