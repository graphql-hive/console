import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import {
  Close,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
} from '@radix-ui/react-dialog';

const Sheet = Root;

const SheetTrigger = Trigger;

const SheetClose = Close;

const SheetPortal = Portal;
SheetPortal.displayName = Portal.displayName;

const SheetOverlay = createForwardRefComponent(Overlay)(({ className, ...props }, ref) => (
  <Overlay
    className={cn(
      'bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm',
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof Content>,
    VariantProps<typeof sheetVariants> {
  noOverlay?: boolean;
}

const SheetContent = forwardRef<ElementRef<typeof Content>, SheetContentProps>(
  ({ side = 'right', className, children, noOverlay, ...props }, ref) => (
    <SheetPortal>
      {noOverlay ? null : <SheetOverlay />}
      <Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Close>
      </Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = Content.displayName;

const SheetHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = createForwardRefComponent(Title)(({ className, ...props }, ref) => (
  <Title ref={ref} className={cn('text-foreground text-lg font-semibold', className)} {...props} />
));
SheetTitle.displayName = Title.displayName;

const SheetDescription = createForwardRefComponent(Description)(({ className, ...props }, ref) => (
  <Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
));
SheetDescription.displayName = Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
