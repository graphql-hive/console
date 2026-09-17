import { useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { FloatingPortalContainerProvider } from '../../floating/floating-portal-container';
import type { FloatingProps } from '../../floating/shared-styles';
import {
  backdropClass,
  OverlayBody,
  OverlayCloseButton,
  OverlayFooter,
  OverlayHeader,
  popupSurfaceClass,
} from '../overlay-parts';

const widthClass = {
  md: 'sm:max-w-[700px]',
  lg: 'sm:max-w-[800px]',
  half: 'sm:max-w-[50vw]',
} as const;

const popupClass = cn(
  popupSurfaceClass,
  'fixed inset-y-0 right-0 h-dvh w-full border-l',
  'ease-authentic transition-[translate,opacity] duration-300',
  'data-[starting-style]:translate-x-full data-[starting-style]:opacity-0',
  'data-[ending-style]:translate-x-full data-[ending-style]:opacity-0',
);

export type SheetProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fires once the open or close transition has finished; see Dialog. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** What opens the sheet. Optional: most sheets are opened by state set somewhere else. */
  trigger?: FloatingProps['trigger'];
  title: ReactNode;
  description?: ReactNode;
  /** The body. The header and footer stay put; this scrolls. */
  children?: ReactNode;
  /** Actions, pinned to the bottom edge. */
  footer?: ReactNode;
  width?: keyof typeof widthClass;
  /**
   * `none` for a body that lays itself out edge to edge and scrolls on its own, such as a trace
   * tree or a tab strip over a list. It gets the remaining height as a flex column.
   */
  padding?: 'default' | 'none';
  /** The × in the corner. */
  closeButton?: boolean;
  /** Clicking the backdrop closes the sheet. Off for a form a stray click would lose. */
  dismissible?: boolean;
  attrs?: Record<string, string>;
};

export function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  onOpenChangeComplete,
  trigger,
  title,
  description,
  children,
  footer,
  width = 'md',
  padding = 'default',
  closeButton = true,
  dismissible = true,
  attrs,
}: SheetProps) {
  // See Dialog: base menus and selects inside the sheet render their popups into it.
  const [popup, setPopup] = useState<HTMLElement | null>(null);

  return (
    <BaseDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      disablePointerDismissal={!dismissible}
    >
      {trigger ? <BaseDialog.Trigger render={trigger as ReactElement} /> : null}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClass} />
        <BaseDialog.Popup ref={setPopup} className={cn(popupClass, widthClass[width])} {...attrs}>
          <FloatingPortalContainerProvider container={popup}>
            <OverlayHeader title={title} description={description} clearCloseButton={closeButton} />
            {children != null ? (
              <OverlayBody padding={padding} padBottom={footer == null && padding === 'default'}>
                {children}
              </OverlayBody>
            ) : null}
            {footer != null ? <OverlayFooter>{footer}</OverlayFooter> : null}
            {closeButton ? <OverlayCloseButton /> : null}
          </FloatingPortalContainerProvider>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
