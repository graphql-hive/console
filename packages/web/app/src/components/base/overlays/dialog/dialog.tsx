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
  sm: 'max-w-[425px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[960px]',
} as const;

const popupClass = cn(
  popupSurfaceClass,
  'fixed left-1/2 top-1/2 max-h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg',
  'ease-authentic transition-[opacity,scale] duration-200',
  'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
  'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
);

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** What opens the dialog. Optional: most dialogs are opened by state set somewhere else. */
  trigger?: FloatingProps['trigger'];
  title: ReactNode;
  description?: ReactNode;
  /** The body. It scrolls on its own once the dialog reaches the viewport height. */
  children?: ReactNode;
  /** Actions, laid out right-aligned. */
  footer?: ReactNode;
  width?: keyof typeof widthClass;
  /** The × in the corner. Off for a dialog that has to be answered, such as the prompt. */
  closeButton?: boolean;
  /** Clicking the backdrop closes the dialog. Off for a form a stray click would lose. */
  dismissible?: boolean;
  attrs?: Record<string, string>;
};

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  width = 'md',
  closeButton = true,
  dismissible = true,
  attrs,
}: DialogProps) {
  // Handed to the portal-container context, so base menus and selects inside the dialog render
  // their popups into it rather than into `<body>`, which a modal dialog makes inert.
  const [popup, setPopup] = useState<HTMLElement | null>(null);

  return (
    <BaseDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disablePointerDismissal={!dismissible}
    >
      {trigger ? <BaseDialog.Trigger render={trigger as ReactElement} /> : null}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClass} />
        <BaseDialog.Popup ref={setPopup} className={cn(popupClass, widthClass[width])} {...attrs}>
          <FloatingPortalContainerProvider container={popup}>
            <OverlayHeader title={title} description={description} clearCloseButton={closeButton} />
            {children != null ? (
              <OverlayBody padding="default" padBottom={footer == null}>
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
